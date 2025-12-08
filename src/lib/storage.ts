// Enhanced Storage using IndexedDB with localStorage fallback
// Better for storing images and large data temporarily

import { CollectedData } from './dataCollection';

const DB_NAME = 'WhatsAppTrackerDB';
const DB_VERSION = 1;
const STORE_TRACKING = 'tracking_data';
const STORE_GROUPS = 'groups';
const STORE_IMAGES = 'images';

// Check if IndexedDB is available
function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORE_TRACKING)) {
        const trackingStore = db.createObjectStore(STORE_TRACKING, { keyPath: 'id', autoIncrement: true });
        trackingStore.createIndex('groupId', 'metadata.groupId', { unique: false });
        trackingStore.createIndex('timestamp', 'metadata.timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_GROUPS)) {
        db.createObjectStore(STORE_GROUPS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
      }
    };
  });
}

// Save tracking data to IndexedDB
export async function saveTrackingData(data: CollectedData): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_TRACKING], 'readwrite');
      const store = transaction.objectStore(STORE_TRACKING);

      // Add unique ID if not present
      const dataWithId = {
        ...data,
        id: `${data.metadata.groupId}_${data.metadata.timestamp}_${Date.now()}`,
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.add(dataWithId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
    }
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  const existingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
  existingData.push(data);
  localStorage.setItem('tracking_data', JSON.stringify(existingData));

  // Also save to group-specific storage
  const groupData = JSON.parse(localStorage.getItem(`group_tracking_${data.metadata.groupId}`) || '[]');
  groupData.push(data);
  localStorage.setItem(`group_tracking_${data.metadata.groupId}`, JSON.stringify(groupData));
}

// Get all tracking data from IndexedDB
export async function getAllTrackingData(): Promise<CollectedData[]> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_TRACKING], 'readonly');
      const store = transaction.objectStore(STORE_TRACKING);

      const data = await new Promise<CollectedData[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result.map((item: any) => {
            // Remove the auto-generated id
            const { id, ...data } = item;
            return data;
          });
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });

      db.close();
      return data;
    }
  } catch (error) {
    console.warn('IndexedDB read failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  return JSON.parse(localStorage.getItem('tracking_data') || '[]');
}

// Get tracking data by group ID
export async function getTrackingDataByGroup(groupId: string): Promise<CollectedData[]> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_TRACKING], 'readonly');
      const store = transaction.objectStore(STORE_TRACKING);
      const index = store.index('groupId');

      const data = await new Promise<CollectedData[]>((resolve, reject) => {
        const request = index.getAll(groupId);
        request.onsuccess = () => {
          const results = request.result.map((item: any) => {
            const { id, ...data } = item;
            return data;
          });
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });

      db.close();
      return data;
    }
  } catch (error) {
    console.warn('IndexedDB read failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  return JSON.parse(localStorage.getItem(`group_tracking_${groupId}`) || '[]');
}

// Save group data
export async function saveGroupData(groupId: string, groupData: any): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_GROUPS], 'readwrite');
      const store = transaction.objectStore(STORE_GROUPS);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id: groupId, ...groupData });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
    }
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  localStorage.setItem(`group_${groupId}`, JSON.stringify(groupData));
}

// Get group data
export async function getGroupData(groupId: string): Promise<any | null> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_GROUPS], 'readonly');
      const store = transaction.objectStore(STORE_GROUPS);

      const data = await new Promise<any | null>((resolve, reject) => {
        const request = store.get(groupId);
        request.onsuccess = () => {
          if (request.result) {
            const { id, ...groupData } = request.result;
            resolve(groupData);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });

      db.close();
      return data;
    }
  } catch (error) {
    console.warn('IndexedDB read failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  const data = localStorage.getItem(`group_${groupId}`);
  return data ? JSON.parse(data) : null;
}

// Save image separately (for better storage management)
export async function saveImage(imageId: string, imageData: string): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_IMAGES], 'readwrite');
      const store = transaction.objectStore(STORE_IMAGES);

      // Convert base64 to Blob for better storage efficiency
      const blob = await base64ToBlob(imageData);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id: imageId, blob, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      db.close();
      return;
    }
  } catch (error) {
    console.warn('IndexedDB image save failed, using localStorage fallback:', error);
  }

  // Fallback: Store in localStorage (limited size)
  try {
    localStorage.setItem(`image_${imageId}`, imageData);
  } catch (e) {
    console.warn('localStorage full, cannot save image:', e);
  }
}

// Get image
export async function getImage(imageId: string): Promise<string | null> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      const transaction = db.transaction([STORE_IMAGES], 'readonly');
      const store = transaction.objectStore(STORE_IMAGES);

      const data = await new Promise<string | null>((resolve, reject) => {
        const request = store.get(imageId);
        request.onsuccess = () => {
          if (request.result) {
            blobToBase64(request.result.blob).then(resolve).catch(reject);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });

      db.close();
      return data;
    }
  } catch (error) {
    console.warn('IndexedDB image read failed, using localStorage fallback:', error);
  }

  // Fallback to localStorage
  return localStorage.getItem(`image_${imageId}`);
}

// Helper: Convert base64 to Blob
function base64ToBlob(base64: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const base64Data = base64.split(',')[1] || base64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      resolve(blob);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper: Convert Blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Clear all data (useful for testing or cleanup)
export async function clearAllData(): Promise<void> {
  try {
    if (isIndexedDBAvailable()) {
      const db = await openDB();
      
      // Clear all stores
      const stores = [STORE_TRACKING, STORE_GROUPS, STORE_IMAGES];
      for (const storeName of stores) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      db.close();
    }
  } catch (error) {
    console.warn('IndexedDB clear failed:', error);
  }

  // Clear localStorage
  localStorage.clear();
}

// Get storage usage info
export async function getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = quota - used;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return { used, available, percentage };
    } catch (error) {
      console.warn('Storage estimate failed:', error);
    }
  }

  // Fallback: Estimate localStorage usage
  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // localStorage typically has ~5-10MB limit
  const quota = 5 * 1024 * 1024; // 5MB estimate
  const available = quota - used;
  const percentage = (used / quota) * 100;

  return { used, available, percentage };
}

