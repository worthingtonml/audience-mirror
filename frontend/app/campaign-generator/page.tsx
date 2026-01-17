'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  AlertCircle,
  Facebook,
  Instagram,
  Search,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type AcquisitionSegmentSummary = {
  segmentId: string;
  segmentLabel: string;
  neighborhoods: string[];
  procedures: string[];
  cohort: string;
  patientCount: number;
  avgLtv: number;
  avgAge: number;
  avgVisitsPerYear: number;
  avgIncome: number;
  profileLabel: string;
};

type AcquisitionProjection = {
  projectedRevenueMonthly: number;
  projectedNewPatientsMonthly: number;
  projectedAdSpendMonthly: number;
  projectedReturnMultiple: number;
};

type ChannelKey = 'facebook' | 'instagram' | 'google';

type ChannelRecommendation = {
  id: ChannelKey;
  label: string;
  role: string;
  budgetSharePercent: number;
  dailyBudget: number;
  description: string;
};

type GeneratedAdContent = {
  strategy: string;
  targetingFocus: string;
  adCopy: { headline: string; description: string }[];
  brief: string;
};

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-6"></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-3">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />
      <div className="p-6">
        <div className="h-3 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="flex items-center gap-6 pb-6 mb-4 border-b border-gray-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-baseline gap-2">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

type AcquisitionPageHeaderProps = {
  segmentSummary: AcquisitionSegmentSummary | null;
  loading: boolean;
};

function AcquisitionPageHeader({ segmentSummary, loading }: AcquisitionPageHeaderProps) {
  const router = useRouter();

  const subtitle = segmentSummary
    ? `${segmentSummary.neighborhoods.length} neighborhood${segmentSummary.neighborhoods.length !== 1 ? 's' : ''} · ${segmentSummary.procedures.join(', ')} · ${segmentSummary.profileLabel} patients`
    : '';

  return (
    <div className="py-6 flex items-start justify-between gap-4 mb-6">
      {/* Left side - Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find New Patients</h1>
        <div className="flex items-center gap-2 mt-1">
          {!loading && subtitle && (
            <>
              <span className="text-gray-500 text-sm">{subtitle}</span>
              <span className="text-gray-300">•</span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Ready to act
          </span>
        </div>
      </div>

      {/* Right side - Back button */}
      <button
        onClick={() => router.push('/patient-insights')}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      >
        <ArrowLeft className="h-4 w-4 inline mr-2" />
        Back to insights
      </button>
    </div>
  );
}

// ============================================================================
// REVENUE PROJECTION (SECONDARY)
// ============================================================================

type RevenueProjectionSecondaryProps = {
  projection: AcquisitionProjection;
  vipCount?: number;
};

function RevenueProjectionSecondary({ projection, vipCount }: RevenueProjectionSecondaryProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const newVIPs = vipCount ? Math.ceil(vipCount * 0.14) : projection.projectedNewPatientsMonthly;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
        What this campaign can add each month
      </p>

      <div className="flex items-center gap-8">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(projection.projectedRevenueMonthly)}
          </span>
          <span className="text-gray-400 text-sm">revenue</span>
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(projection.projectedAdSpendMonthly)}
          </span>
          <span className="text-gray-400 text-sm">ad spend</span>
        </div>
        <div className="w-px h-5 bg-gray-300" />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">
            {projection.projectedReturnMultiple.toFixed(1)}×
          </span>
          <span className="text-gray-400 text-sm">return</span>
        </div>
      </div>

      <p className="text-gray-400 text-sm mt-4">
        From {newVIPs} new VIP patients · Based on similar medspas
      </p>
    </div>
  );
}

// ============================================================================
// VIP HERO SECTION
// ============================================================================

type VIPHeroSectionProps = {
  vipData: any;
};

function VIPHeroSection({ vipData }: VIPHeroSectionProps) {
  const router = useRouter();

  if (!vipData || !vipData.summary) return null;

  const { summary, providerRisk } = vipData;
  const avgBestValue = summary.avgBestPatientValue || 1250;
  const avgOverallValue = summary.avgOverallValue || 400;
  const multiplier = avgOverallValue > 0 ? (avgBestValue / avgOverallValue).toFixed(1) : '3.1';
  const bestPatientCount = summary.bestPatientCount || 50;
  const revenueConcentration = summary.revenueConcentration || 62;

  // Provider concentration risk
  const hasProviderRisk = providerRisk?.has_concentration_risk;
  const topProvider = providerRisk?.top_provider;
  const vipConcentration = providerRisk?.vip_concentration;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

      <div className="p-8">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            Your VIP Profile
          </span>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full border border-amber-200">
            Top 20%
          </span>

          {/* Info tooltip */}
          <div className="relative group">
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </button>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <p className="font-medium mb-1">How VIPs are calculated:</p>
              <ul className="text-gray-300 text-xs space-y-1">
                <li>• Ranked by lifetime value (total spend)</li>
                <li>• Top 20% of patients by revenue</li>
              </ul>
              <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 rotate-45" />
            </div>
          </div>
        </div>

        {/* Big Headline */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {bestPatientCount} patients generate {revenueConcentration}% of your revenue
        </h1>
        <p className="text-gray-500 mb-8">
          Find more patients like these and you'll grow faster with less effort.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">VIP Count</p>
            <p className="text-3xl font-bold text-gray-900">{bestPatientCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Avg VIP LTV</p>
            <p className="text-3xl font-bold text-gray-900">${avgBestValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">vs Average Patient</p>
            <p className="text-3xl font-bold text-emerald-600">{multiplier}× more</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Revenue Share</p>
            <p className="text-3xl font-bold text-amber-600">{revenueConcentration}%</p>
          </div>
        </div>

        {/* VIP Characteristics */}
        <div className="border-t border-gray-100 pt-6">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">What makes them VIPs</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
              4+ visits per year
            </span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
              Multiple service types
            </span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
              ${avgBestValue.toLocaleString()}+ lifetime spend
            </span>
            <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
              Refers friends
            </span>
          </div>
        </div>

        {/* Provider Risk Warning (only show if risk exists) */}
        {vipConcentration && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">Key Person Risk</p>
                <p className="text-sm text-amber-700">
                  {vipConcentration.vip_pct}% of VIP revenue is tied to {topProvider?.name} — putting ~${Math.round((avgBestValue * bestPatientCount * vipConcentration.vip_pct) / 100).toLocaleString()} at risk if they leave.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CHANNEL MIX SECTION
// ============================================================================

type ChannelMixSectionProps = {
  channels: ChannelRecommendation[];
  segmentId: string;
  onExport: () => void;
  exporting: boolean;
};

function ChannelMixSection({ channels }: { channels: ChannelRecommendation[] }) {
  const channelConfig: Record<ChannelKey, { iconBg: string; iconColor: string; icon: React.ReactNode }> = {
    facebook: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', icon: <Facebook className="h-5 w-5" /> },
    instagram: { iconBg: 'bg-pink-100', iconColor: 'text-pink-600', icon: <Instagram className="h-5 w-5" /> },
    google: { iconBg: 'bg-gray-100', iconColor: 'text-gray-700', icon: <Search className="h-5 w-5" /> },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Where to find more VIPs</h3>

      <div className="grid grid-cols-3 gap-4">
        {channels.map((channel) => {
          const config = channelConfig[channel.id];
          return (
            <div key={channel.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 ${config.iconBg} rounded-lg flex items-center justify-center ${config.iconColor}`}>
                  {config.icon}
                </div>
                <span className="font-medium text-gray-900">{channel.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{channel.budgetSharePercent}%</p>
              <p className="text-gray-500 text-sm">of budget · ${channel.dailyBudget}/day</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}



// ============================================================================
// CHANNEL CARD
// ============================================================================

type ChannelCardProps = {
  channel: ChannelRecommendation;
  segmentId: string;
};

function ChannelCard({ channel, segmentId }: ChannelCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedAdContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const channelConfig: Record<ChannelKey, { iconBg: string; iconColor: string; icon: React.ReactNode }> = {
    facebook: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', icon: <Facebook className="h-5 w-5" /> },
    instagram: { iconBg: 'bg-pink-100', iconColor: 'text-pink-600', icon: <Instagram className="h-5 w-5" /> },
    google: { iconBg: 'bg-gray-100', iconColor: 'text-gray-700', icon: <Search className="h-5 w-5" /> },
  };

  const config = channelConfig[channel.id];

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/acquisition/${segmentId}/channels/${channel.id}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate ad content');
      }

      const data = await response.json();
      setContent(data);
    } catch (err) {
      setError('Failed to generate ad content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAdContent = () => {
    if (!content) return;
    const text = content.adCopy
      .map((ad) => `Headline: ${ad.headline}\n\n${ad.description}`)
      .join('\n\n---\n\n');
    handleCopy(text, 'ad-copy');
  };

  const copyBrief = () => {
    if (!content) return;
    handleCopy(content.brief, 'brief');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="text-left">
            <span className="font-medium text-gray-900">{channel.label}</span>
            <p className="text-gray-500 text-sm">Click to see tactical guidance + create ad copy</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Tactical Guidance */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 mt-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-gray-700" />
              <h4 className="text-sm font-semibold text-gray-900">Tactical Guidance</h4>
            </div>

            {channel.id === 'facebook' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Campaign Objectives</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Awareness:</span> Reach campaigns with demographic + interest targeting</p>
                    <p>• <span className="font-medium">Consideration:</span> Engagement + Video Views for educational content</p>
                    <p>• <span className="font-medium">Conversion:</span> Lead Generation campaigns with instant forms</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Audience Strategy</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Lookalike:</span> Upload your VIP patient list (top 20%) to create 1-3% lookalikes</p>
                    <p>• <span className="font-medium">Interest:</span> Beauty, wellness, cosmetic procedures, local gyms/spas</p>
                    <p>• <span className="font-medium">Retargeting:</span> Website visitors (last 30 days), video viewers (50%+)</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Creative Best Practices</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Use carousel ads with before/after transformations (3-5 slides)</p>
                    <p>• Include patient testimonials as video (15-30 sec)</p>
                    <p>• CTA: "Book Free Consultation" or "Learn More" (avoid "Shop Now")</p>
                  </div>
                </div>
              </div>
            )}

            {channel.id === 'instagram' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Ad Formats</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Stories:</span> 9:16 vertical, 15-sec video clips with "Swipe Up" CTA</p>
                    <p>• <span className="font-medium">Reels:</span> Trending audio + before/after transformations (30 sec max)</p>
                    <p>• <span className="font-medium">Feed:</span> High-quality images in carousel format (4:5 ratio)</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Content Strategy</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Organic + Paid:</span> Run ads to promote your best-performing organic posts</p>
                    <p>• <span className="font-medium">Influencer Partnerships:</span> Partner with local micro-influencers (5-50k followers)</p>
                    <p>• <span className="font-medium">User-Generated Content:</span> Repost patient results with permission</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Engagement Tactics</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Respond to all DMs within 1 hour (use auto-responders for after-hours)</p>
                    <p>• Run "Ask Me Anything" sessions in Stories monthly</p>
                    <p>• Use polls and quizzes to boost engagement and algorithm visibility</p>
                  </div>
                </div>
              </div>
            )}

            {channel.id === 'google' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Campaign Types</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Search Ads:</span> Target high-intent keywords ("botox near me", "best medspa")</p>
                    <p>• <span className="font-medium">Local Services Ads:</span> Google-guaranteed badge for trust + top placement</p>
                    <p>• <span className="font-medium">Performance Max:</span> AI-optimized across Search, Display, YouTube, Gmail</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Keyword Strategy</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <span className="font-medium">Exact Match:</span> "[botox]", "[medspa near me]"</p>
                    <p>• <span className="font-medium">Phrase Match:</span> "botox near me", "best medspa"</p>
                    <p>• <span className="font-medium">Negative Keywords:</span> -free, -cheap, -DIY, -school, -training</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Landing Page Optimization</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Match ad copy to headline (Quality Score boost)</p>
                    <p>• Include click-to-call button (mobile-optimized)</p>
                    <p>• Add booking widget above the fold (reduce friction)</p>
                    <p>• Display reviews/ratings prominently (social proof)</p>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Bidding & Budget</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Start with "Maximize Conversions" (manual CPC after 30 conversions)</p>
                    <p>• Set location bid adjustments (+20% for high-value ZIP codes)</p>
                    <p>• Monitor Search Impression Share (aim for 70%+ to dominate local search)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strategy band (if generated) */}
          {content?.strategy && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-gray-900">{content.strategy}</p>
            </div>
          )}

          {/* Targeting focus (if generated) */}
          {content?.targetingFocus && (
            <div className="mt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Targeting Focus
              </div>
              <p className="text-sm text-gray-700">{content.targetingFocus}</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="text-sm text-red-600 hover:text-red-700 underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Empty state / Generate button */}
          {!content && !error && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-4">
                Click "Create my {channel.label} ad text" to get headlines and copy tailored to your data.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating ad text...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Create my {channel.label} ad text
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated ad copy */}
          {content && (
            <div className="mt-4 space-y-4">
              {content.adCopy.map((ad, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {idx === 0 ? 'Primary Ad' : `Variant ${idx + 1}`}
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 mb-1">Headline</div>
                    <p className="font-semibold text-gray-900">{ad.headline}</p>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Ad copy</div>
                    <p className="text-sm text-gray-700">{ad.description}</p>
                  </div>
                </div>
              ))}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={copyAdContent}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    copiedField === 'ad-copy'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {copiedField === 'ad-copy' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy ad copy
                    </>
                  )}
                </button>

                <button
                  onClick={copyBrief}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    copiedField === 'brief'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {copiedField === 'brief' ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy brief for {channel.label}
                    </>
                  )}
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AD CAMPAIGNS SECTION
// ============================================================================

type AdCampaignsSectionProps = {
  channels: ChannelRecommendation[];
  segmentId: string;
};

function AdCampaignsSection({ channels, segmentId }: AdCampaignsSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Ready-to-use campaigns</h3>

      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} segmentId={segmentId} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function AcquisitionCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const segmentId = searchParams.get('segmentId') || searchParams.get('run_id') || (typeof window !== 'undefined' ? sessionStorage.getItem('runId') : '') || '';

  // State
  const [summary, setSummary] = useState<AcquisitionSegmentSummary | null>(null);
  const [projection, setProjection] = useState<AcquisitionProjection | null>(null);
  const [channels, setChannels] = useState<ChannelRecommendation[]>([]);
  const [vipData, setVipData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      if (!segmentId) {
        setError('No segment ID provided');
        setLoading(false);
        return;
      }

      try {
        const [summaryRes, projectionRes, channelsRes] = await Promise.all([
          fetch(`${API_URL}/api/segments/${segmentId}/acquisition-summary`),
          fetch(`${API_URL}/api/acquisition/${segmentId}/projection`),
          fetch(`${API_URL}/api/acquisition/${segmentId}/channels`),
        ]);

        if (!summaryRes.ok || !projectionRes.ok || !channelsRes.ok) {
          throw new Error('Failed to load campaign data');
        }

        const [summaryData, projectionData, channelsData] = await Promise.all([
          summaryRes.json(),
          projectionRes.json(),
          channelsRes.json(),
        ]);

        setSummary(summaryData);
        setProjection(projectionData);
        setChannels(channelsData);

        // Fetch VIP data from patient-intel API
        const uploadId = localStorage.getItem('uploadId');
        if (uploadId) {
          try {
            const vipRes = await fetch(`${API_URL}/api/v1/patient-intel/${uploadId}`);
            if (vipRes.ok) {
              const vipDataResult = await vipRes.json();
              setVipData(vipDataResult);
            }
          } catch (vipErr) {
            console.error('[VIP Data Error]', vipErr);
          }
        }
      } catch (err) {
        setError('Failed to load campaign data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [segmentId]);

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/acquisition/${segmentId}/export`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `acquisition-campaign-${segmentId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Patient Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <AcquisitionPageHeader segmentSummary={summary} loading={loading} />

        {/* Main content */}
        <div className="space-y-6">
          {/* VIP Hero Section - FIRST */}
          {loading ? (
            <SkeletonHero />
          ) : vipData ? (
            <VIPHeroSection vipData={vipData} />
          ) : null}

          {/* Revenue Projection - Secondary */}
          {!loading && projection && (
            <RevenueProjectionSecondary
              projection={projection}
              vipCount={vipData?.summary?.bestPatientCount}
            />
          )}

          {/* Platform Budget Split */}
          {!loading && channels.length > 0 && (
            <ChannelMixSection channels={channels} />
          )}

          {/* Ad Campaigns - Collapsed by default */}
          {!loading && channels.length > 0 && (
            <AdCampaignsSection channels={channels} segmentId={segmentId} />
          )}
        </div>

        {/* Back Link */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patient Insights
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading campaign data...</p>
      </div>
    </div>
  );
}

// Default export wrapped in Suspense
export default function AcquisitionCampaignPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcquisitionCampaignPageContent />
    </Suspense>
  );
}
