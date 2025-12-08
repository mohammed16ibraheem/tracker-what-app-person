// Data Export Utility - Save all tracking data to files organized by group ID
import JSZip from 'jszip';
import { CollectedData } from './dataCollection';
import { getTrackingDataByGroup, getGroupData, getAllTrackingData } from './storage';

/**
 * Export all data for a specific group to downloadable files
 * Creates a folder structure: data/{groupId}/ with all files inside
 */
export async function exportGroupData(groupId: string): Promise<void> {
  try {
    // Load all tracking data for this group using new storage system
    const groupTrackingData = await getTrackingDataByGroup(groupId);

    if (groupTrackingData.length === 0) {
      alert('No data found for this group');
      return;
    }

    // Load group info using new storage system
    const groupData = await getGroupData(groupId) || {};

    // Create zip file
    const zip = new JSZip();
    const folder = zip.folder(`data/${groupId}`);

    if (!folder) {
      throw new Error('Failed to create folder');
    }

    // 1. Save group info
    folder.file('group-info.json', JSON.stringify(groupData, null, 2));

    // 2. Save all tracking data entries
    groupTrackingData.forEach((data, index) => {
      const entryFolder = folder.folder(`entry-${index + 1}`);
      if (!entryFolder) return;

      // Save main data as JSON
      entryFolder.file('data.json', JSON.stringify(data, null, 2));

      // Save camera image if available
      if (data.cameraImage) {
        // Convert base64 to blob
        const base64Data = data.cameraImage.split(',')[1] || data.cameraImage;
        entryFolder.file('camera-image.jpg', base64Data, { base64: true });
      }

      // Save individual data files
      if (data.gpsLocation) {
        entryFolder.file('gps-location.txt', 
          `GPS Location\n` +
          `Latitude: ${data.gpsLocation.latitude}\n` +
          `Longitude: ${data.gpsLocation.longitude}\n` +
          `Accuracy: ${data.gpsLocation.accuracy}m\n`
        );
      }

      if (data.ipLocation) {
        entryFolder.file('ip-location.txt',
          `IP Location\n` +
          `IP Address: ${data.ipAddress}\n` +
          `Country: ${data.ipLocation.country}\n` +
          `Region: ${data.ipLocation.region}\n` +
          `City: ${data.ipLocation.city}\n` +
          `Timezone: ${data.ipLocation.timezone}\n` +
          `ISP: ${data.ipLocation.isp}\n` +
          `VPN: ${data.ipLocation.isVPN ? 'Yes' : 'No'}\n` +
          `Proxy: ${data.ipLocation.isProxy ? 'Yes' : 'No'}\n`
        );
      }

      entryFolder.file('device-info.txt',
        `Device Information\n` +
        `Type: ${data.deviceInfo.type}\n` +
        `OS: ${data.deviceInfo.os} ${data.deviceInfo.osVersion}\n` +
        `Browser: ${data.deviceInfo.browser} ${data.deviceInfo.browserVersion}\n` +
        `Platform: ${data.deviceInfo.platform}\n` +
        `Fingerprint: ${data.deviceFingerprint}\n`
      );

      if (data.analysis.flags.length > 0) {
        entryFolder.file('suspicious-flags.txt',
          `Suspicious Indicators\n` +
          data.analysis.flags.map(flag => `• ${flag}`).join('\n')
        );
      }

      entryFolder.file('timestamp.txt',
        `Timestamp: ${data.metadata.timestamp}\n` +
        `Session ID: ${data.metadata.sessionId}\n`
      );
    });

    // 3. Create summary file
    folder.file('summary.txt',
      `Group Data Summary\n` +
      `Group ID: ${groupId}\n` +
      `Group Name: ${groupData.name || 'Unknown'}\n` +
      `Total Entries: ${groupTrackingData.length}\n` +
      `Created: ${groupData.createdAt || 'Unknown'}\n\n` +
      `Entries:\n` +
      groupTrackingData.map((data, index) => 
        `${index + 1}. ${new Date(data.metadata.timestamp).toLocaleString()} - ` +
        `${data.gpsLocation ? 'GPS' : 'No GPS'} - ` +
        `${data.cameraImage ? 'Photo' : 'No Photo'} - ` +
        `${data.analysis.flags.length} flags`
      ).join('\n')
    );

    // Generate and download zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-${groupId}-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert(`Data exported successfully! Downloaded: data-${groupId}.zip`);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data. Please try again.');
  }
}

/**
 * Export all data from all groups
 */
export async function exportAllData(): Promise<void> {
  try {
    const allData = JSON.parse(localStorage.getItem('tracking_data') || '[]') as CollectedData[];
    
    if (allData.length === 0) {
      alert('No data found');
      return;
    }

    const zip = new JSZip();
    const dataFolder = zip.folder('data');

    if (!dataFolder) {
      throw new Error('Failed to create data folder');
    }

    // Group data by groupId
    const groupedData: { [key: string]: CollectedData[] } = {};
    allData.forEach(data => {
      const groupId = data.metadata.groupId;
      if (!groupedData[groupId]) {
        groupedData[groupId] = [];
      }
      groupedData[groupId].push(data);
    });

    // Export each group
    for (const [groupId, groupData] of Object.entries(groupedData)) {
      const groupFolder = dataFolder.folder(groupId);
      if (!groupFolder) continue;

      // Load group info
      const groupInfo = JSON.parse(localStorage.getItem(`group_${groupId}`) || '{}');
      groupFolder.file('group-info.json', JSON.stringify(groupInfo, null, 2));

      groupData.forEach((data, index) => {
        const entryFolder = groupFolder.folder(`entry-${index + 1}`);
        if (!entryFolder) return;

        entryFolder.file('data.json', JSON.stringify(data, null, 2));

        if (data.cameraImage) {
          const base64Data = data.cameraImage.split(',')[1] || data.cameraImage;
          entryFolder.file('camera-image.jpg', base64Data, { base64: true });
        }
      });
    }

    // Generate and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-tracking-data-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('All data exported successfully!');
  } catch (error) {
    console.error('Error exporting all data:', error);
    alert('Failed to export data. Please try again.');
  }
}

