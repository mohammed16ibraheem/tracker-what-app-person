'use client';

import { useState, useEffect } from 'react';
import { CollectedData } from '@/lib/dataCollection';
import { exportGroupData, exportAllData } from '@/lib/dataExport';
import { checkGroupData } from '@/lib/checkData';
import { getAllTrackingData } from '@/lib/storage';
import { 
  Download, 
  Search, 
  Users, 
  MapPin, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  Camera,
  Globe,
  Activity,
  AlertTriangle,
  TrendingUp,
  Filter,
  FileDown,
  Eye,
  BarChart3
} from 'lucide-react';

export default function ViewDataPage() {
  const [allData, setAllData] = useState<CollectedData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [checkGroupId, setCheckGroupId] = useState<string>('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllTrackingData();
      setAllData(data);
      const uniqueGroups = [...new Set(data.map((d: CollectedData) => d.metadata.groupId))] as string[];
      setGroups(uniqueGroups);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = selectedGroup === 'all' 
    ? allData 
    : allData.filter(d => d.metadata.groupId === selectedGroup);

  const handleCheckGroup = async () => {
    if (!checkGroupId.trim()) {
      alert('Please enter a group ID');
      return;
    }
    const result = await checkGroupData(checkGroupId.trim());
    setCheckResult(result);
  };

  // Calculate statistics
  const stats = {
    total: filteredData.length,
    withGPS: filteredData.filter(d => d.gpsLocation).length,
    withPhoto: filteredData.filter(d => d.cameraImage).length,
    suspicious: filteredData.filter(d => d.analysis.flags.length > 0).length,
    vpnDetected: filteredData.filter(d => d.ipLocation?.isVPN).length,
    safe: filteredData.filter(d => d.analysis.flags.length === 0).length,
  };

  const suspiciousPercentage = stats.total > 0 
    ? Math.round((stats.suspicious / stats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Tracking Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Monitor and analyze collected data</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedGroup !== 'all' && (
                <button
                  onClick={() => exportGroupData(selectedGroup)}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg flex items-center space-x-2 font-medium text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Group</span>
                </button>
              )}
              <button
                onClick={exportAllData}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center space-x-2 font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards - Professional Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Entries collected</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">GPS</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.withGPS}</p>
            <p className="text-xs text-slate-500 mt-1">With location</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Photos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.withPhoto}</p>
            <p className="text-xs text-slate-500 mt-1">Captured</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Safe</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.safe}</p>
            <p className="text-xs text-slate-500 mt-1">No flags</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-red-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Suspicious</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.suspicious}</p>
            <p className="text-xs text-slate-500 mt-1">{suspiciousPercentage}% of total</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-orange-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VPN</span>
            </div>
            <p className="text-3xl font-bold text-orange-600">{stats.vpnDetected}</p>
            <p className="text-xs text-slate-500 mt-1">Detected</p>
          </div>
        </div>

        {/* Filter and Search Section */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span>Filter by Group</span>
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-slate-900 transition-all"
              >
                <option value="all">📊 All Groups ({groups.length})</option>
                {groups.map(groupId => (
                  <option key={groupId} value={groupId}>🔗 {groupId}</option>
                ))}
              </select>
            </div>
            <div className="bg-slate-50 rounded-lg px-6 py-4 border-2 border-emerald-500">
              <p className="text-xs text-slate-500 mb-1 font-medium">Currently Showing</p>
              <p className="text-3xl font-bold text-emerald-600">{filteredData.length}</p>
              <p className="text-xs text-slate-500 mt-1">{filteredData.length === 1 ? 'entry' : 'entries'}</p>
            </div>
          </div>

          {/* Quick Check Section */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-500" />
              <span>Quick Check Group Data</span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={checkGroupId}
                onChange={(e) => setCheckGroupId(e.target.value)}
                placeholder="Enter group ID (e.g., j0d5ne9u3xm)"
                className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
              />
              <button
                onClick={handleCheckGroup}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Check Now
              </button>
            </div>
            {checkResult && (
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                checkResult.exists
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {checkResult.exists ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <p className="text-base font-bold text-emerald-700">Group Found!</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Group Name</p>
                        <p className="font-semibold text-slate-900">{checkResult.groupInfo?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Created</p>
                        <p className="font-semibold text-slate-900">
                          {checkResult.groupInfo?.createdAt ? new Date(checkResult.groupInfo.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Tracking Entries</p>
                        <p className="font-semibold text-slate-900">{checkResult.trackingDataCount}</p>
                      </div>
                    </div>
                    {checkResult.hasData ? (
                      <div className="flex items-center space-x-2 mt-3 p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm text-emerald-700 font-semibold">✓ Data is stored and ready to export</p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mt-3 p-2 bg-yellow-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm text-yellow-700 font-semibold">⚠ No tracking data yet (no one has joined)</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-base font-bold text-red-700">Group not found in storage</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Cards Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Collected Data</h2>
              <p className="text-sm text-slate-500 mt-1">Detailed information for each entry</p>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Activity className="w-8 h-8 text-slate-400 animate-pulse" />
              </div>
              <p className="text-slate-500">Loading data...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredData.map((data, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-slate-200 overflow-hidden">
                  {/* Entry Header */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Entry</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {new Date(data.metadata.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {data.analysis.flags.length > 0 ? (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-red-100 rounded-lg border border-red-200">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-semibold text-red-600">{data.analysis.flags.length}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 rounded-lg border border-green-200">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-600">Safe</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entry Content */}
                  <div className="p-6 space-y-4">
                    {/* Camera Image */}
                    {data.cameraImage ? (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          <span>📷 Captured Photo</span>
                        </h3>
                        <div className="relative">
                          <img
                            src={data.cameraImage}
                            alt="Captured photo"
                            className="w-full rounded-lg border-2 border-blue-200 max-h-48 object-cover shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`<img src="${data.cameraImage}" style="max-width:100%; height:auto;" />`);
                              }
                            }}
                          />
                          <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold shadow-lg">
                            Click to View
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Status: <span className="font-semibold">{data.metadata.cameraPermissionStatus}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                        <Camera className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">No photo captured</p>
                      </div>
                    )}

                    {/* Location */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>Location Data</span>
                      </h3>
                      <div className="space-y-1 text-xs">
                        {data.gpsLocation && (
                          <p className="text-slate-600">
                            <span className="font-semibold">GPS:</span> {data.gpsLocation.latitude.toFixed(4)}, {data.gpsLocation.longitude.toFixed(4)}
                          </p>
                        )}
                        {data.ipLocation && (
                          <>
                            <p className="text-slate-600">
                              <span className="font-semibold">IP:</span> {data.ipLocation.city}, {data.ipLocation.country}
                            </p>
                            {data.ipLocation.timezone && data.ipLocation.timezone !== 'Unknown' && (
                              <p className="text-slate-500">Timezone: {data.ipLocation.timezone}</p>
                            )}
                            {data.ipLocation.isp && data.ipLocation.isp !== 'Unknown' && (
                              <p className="text-slate-500">ISP: {data.ipLocation.isp}</p>
                            )}
                          </>
                        )}
                        {data.analysis.locationMismatch && (
                          <p className="text-red-600 font-semibold mt-1">⚠️ Location Mismatch</p>
                        )}
                      </div>
                    </div>

                    {/* Device */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span>Device Information</span>
                      </h3>
                      <p className="text-xs text-slate-600">
                        {data.deviceInfo.type} • {data.deviceInfo.os} • {data.deviceInfo.browser}
                      </p>
                      {data.analysis.deviceMismatch && (
                        <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ Device Mismatch</p>
                      )}
                    </div>

                    {/* Network */}
                    {data.networkInfo && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-orange-600" />
                          <span>Network Information</span>
                        </h3>
                        <p className="text-xs text-slate-600">
                          {data.networkInfo.connectionType} • {data.networkInfo.effectiveType}
                        </p>
                        {data.ipLocation?.isVPN && (
                          <p className="text-xs text-orange-600 mt-1 font-semibold">⚠️ VPN Detected</p>
                        )}
                        {data.ipLocation?.isProxy && (
                          <p className="text-xs text-orange-600 mt-1 font-semibold">⚠️ Proxy Detected</p>
                        )}
                      </div>
                    )}

                    {/* Flags */}
                    {data.analysis.flags.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <h3 className="text-xs font-semibold text-red-700 mb-3 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span>Suspicious Indicators ({data.analysis.flags.length})</span>
                        </h3>
                        <ul className="text-xs text-red-700 space-y-1.5">
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

                    {/* Footer */}
                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(data.metadata.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {data.metadata.groupId.substring(0, 10)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Available</h3>
              <p className="text-slate-500 mb-1">No tracking data found for the selected filter.</p>
              <p className="text-sm text-slate-400">Share your group links to start collecting data!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
