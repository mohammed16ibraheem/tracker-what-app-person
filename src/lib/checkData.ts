// Utility to check if data exists for a group ID
import { getGroupData, getTrackingDataByGroup, getAllTrackingData } from './storage';

export async function checkGroupData(groupId: string): Promise<{
  exists: boolean;
  groupInfo: any;
  trackingDataCount: number;
  hasData: boolean;
}> {
  // Check group info using new storage system
  const groupInfo = await getGroupData(groupId);

  // Check tracking data for this group using new storage system
  const groupTrackingData = await getTrackingDataByGroup(groupId);

  // Check in all tracking data
  const allTrackingData = await getAllTrackingData();
  const groupEntries = allTrackingData.filter((d: any) => d.metadata?.groupId === groupId);

  return {
    exists: !!groupInfo,
    groupInfo,
    trackingDataCount: groupTrackingData.length || groupEntries.length,
    hasData: (groupTrackingData.length > 0) || (groupEntries.length > 0),
  };
}

