// Utility to check if data exists for a group ID
export function checkGroupData(groupId: string): {
  exists: boolean;
  groupInfo: any;
  trackingDataCount: number;
  hasData: boolean;
} {
  // Check group info
  const groupInfoStr = localStorage.getItem(`group_${groupId}`);
  const groupInfo = groupInfoStr ? JSON.parse(groupInfoStr) : null;

  // Check tracking data for this group
  const groupTrackingDataStr = localStorage.getItem(`group_tracking_${groupId}`);
  const groupTrackingData = groupTrackingDataStr ? JSON.parse(groupTrackingDataStr) : [];

  // Check in all tracking data
  const allTrackingData = JSON.parse(localStorage.getItem('tracking_data') || '[]');
  const groupEntries = allTrackingData.filter((d: any) => d.metadata?.groupId === groupId);

  return {
    exists: !!groupInfo,
    groupInfo,
    trackingDataCount: groupTrackingData.length || groupEntries.length,
    hasData: (groupTrackingData.length > 0) || (groupEntries.length > 0),
  };
}

