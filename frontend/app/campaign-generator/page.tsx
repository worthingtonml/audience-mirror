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
  Bot,
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
    <div className="bg-gradient-to-r from-[#1e1b4b] via-[#4338ca] to-[#7c3aed] rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-white/20 rounded w-1/4 mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-8 bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
          </div>
        ))}
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
    <div className="mb-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patient Insights
      </button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Your Data-Driven Campaign
          </h1>
          <p className="text-gray-600 mt-1">
            A simple plan to bring in more patients who look like your best VIPs.
          </p>
          {!loading && subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium whitespace-nowrap self-start">
          <Target className="h-4 w-4" />
          Goal: Attract new VIP patients
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// CAMPAIGN PERSONALIZATION CARD
// ============================================================================

type CampaignPersonalizationCardProps = {
  summary: AcquisitionSegmentSummary;
  defaultExpanded?: boolean;
};

function CampaignPersonalizationCard({ summary, defaultExpanded = true }: CampaignPersonalizationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const metrics = [
    { label: 'Patients', value: summary.patientCount.toLocaleString() },
    { label: 'Avg LTV', value: `$${summary.avgLtv.toLocaleString()}` },
    { label: 'Avg Age', value: summary.avgAge.toString() },
    { label: 'Annual Visits', value: summary.avgVisitsPerYear.toFixed(1) },
    { label: 'Avg Income', value: `$${(summary.avgIncome / 1000).toFixed(0)}K` },
    { label: 'Profile', value: summary.profileLabel },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-gray-900">Campaign Personalization</h2>
            <p className="text-sm text-gray-500">This acquisition plan is tailored to your best patients.</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{metric.label}</div>
                <div className="text-lg font-semibold text-gray-900 truncate">{metric.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            For fully personalized patient acquisition campaigns, include age, visit history, and revenue per visit in your CSV.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ACQUISITION PROJECTION HERO
// ============================================================================

type AcquisitionProjectionHeroProps = {
  projection: AcquisitionProjection;
};

function AcquisitionProjectionHero({ projection }: AcquisitionProjectionHeroProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="bg-gradient-to-r from-[#1e1b4b] via-[#4338ca] to-[#7c3aed] rounded-xl p-6 text-white">
      <h3 className="text-sm font-medium text-indigo-200 mb-4">
        What this campaign can add each month
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <div className="text-3xl md:text-4xl font-bold">
            {formatCurrency(projection.projectedRevenueMonthly)}
          </div>
          <div className="text-sm text-indigo-200 mt-1">
            from {projection.projectedNewPatientsMonthly} new VIP patients like the ones you already see
          </div>
        </div>

        <div>
          <div className="text-3xl md:text-4xl font-bold">
            {formatCurrency(projection.projectedAdSpendMonthly)}
          </div>
          <div className="text-sm text-indigo-200 mt-1">ad spend</div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl md:text-4xl font-bold text-emerald-300">
              {projection.projectedReturnMultiple.toFixed(1)}×
            </span>
          </div>
          <div className="text-sm text-indigo-200 mt-1">estimated return</div>
        </div>

        <div>
          <div className="text-3xl md:text-4xl font-bold">
            ${Math.round(projection.projectedAdSpendMonthly / 30)}
          </div>
          <div className="text-sm text-indigo-200 mt-1">per day</div>
        </div>
      </div>

      <p className="text-xs text-indigo-300 mt-6">
        Estimate based on similar medspa campaigns in markets like yours.
      </p>
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

function ChannelMixSection({ channels, segmentId, onExport, exporting }: ChannelMixSectionProps) {
  const channelIcons: Record<ChannelKey, React.ReactNode> = {
    facebook: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    google: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
      </svg>
    ),
  };

  const channelColors: Record<ChannelKey, { bg: string; text: string }> = {
    facebook: { bg: 'bg-blue-50', text: 'text-blue-700' },
    instagram: { bg: 'bg-pink-50', text: 'text-pink-700' },
    google: { bg: 'bg-green-50', text: 'text-green-700' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-1">
        Where to find more patients like your best ones
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Use this mix as a starting point. You can still adjust budgets in Facebook, Instagram, and Google later.
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        {channels.map((channel) => {
          const colors = channelColors[channel.id];
          return (
            <div
              key={channel.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${colors.bg} ${colors.text}`}
            >
              {channelIcons[channel.id]}
              <span className="font-medium">{channel.label}</span>
              <span className="text-sm opacity-75">· {channel.budgetSharePercent}% of budget</span>
              <span className="text-xs opacity-60">· {channel.role}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export plan for my marketer
      </button>
    </div>
  );
}

// ============================================================================
// GEO TEASER CARD (AI Search Visibility)
// ============================================================================

function GeoTeaserCard() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
            Coming Soon
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-2">AI Search Visibility</h3>
        <p className="text-sm text-slate-300 mb-4">
          See how your practice appears when patients ask ChatGPT, Perplexity, or Claude for recommendations. 
          Track your visibility and get tips to rank higher in AI-powered search.
        </p>

        <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            ChatGPT
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            Perplexity
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            Claude
          </div>
        </div>

        <a 
          href="https://forms.gle/B7vc9PDM5udokSAu7" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Join Waitlist
        </a>
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
  const [expanded, setExpanded] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<GeneratedAdContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const channelColors: Record<ChannelKey, { bg: string; text: string; strategy: string }> = {
    facebook: { bg: 'bg-blue-50', text: 'text-blue-700', strategy: 'bg-blue-100 text-blue-800' },
    instagram: { bg: 'bg-pink-50', text: 'text-pink-700', strategy: 'bg-pink-100 text-pink-800' },
    google: { bg: 'bg-green-50', text: 'text-green-700', strategy: 'bg-green-100 text-green-800' },
  };

  const colors = channelColors[channel.id];

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
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
            {channel.id === 'facebook' && (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            {channel.id === 'instagram' && (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            )}
            {channel.id === 'google' && (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{channel.label}</h4>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {channel.budgetSharePercent}% of budget · ${channel.dailyBudget}/day
              </span>
            </div>
            <p className="text-sm text-gray-500">{channel.role}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Strategy band (if generated) */}
          {content?.strategy && (
            <div className={`${colors.strategy} rounded-lg p-4 mt-4`}>
              <p className="text-sm font-medium">{content.strategy}</p>
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
                className="w-full py-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                      : 'bg-[#6366f1] hover:bg-[#4f46e5] text-white'
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
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">Ad campaigns to attract new VIP patients</h3>
        <p className="text-sm text-gray-500 mt-1">
          Copy these proven ad concepts straight into Facebook, Instagram, and Google.
        </p>
      </div>

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
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-[#6366f1] hover:text-[#4f46e5] font-medium"
          >
            ← Back to Patient Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <AcquisitionPageHeader segmentSummary={summary} loading={loading} />

        {/* Main content */}
        <div className="space-y-6">
          {/* Campaign Personalization */}
          {loading ? (
            <SkeletonCard />
          ) : summary ? (
            <CampaignPersonalizationCard summary={summary} defaultExpanded={true} />
          ) : null}

          {/* Projection Hero */}
          {loading ? (
            <SkeletonHero />
          ) : projection ? (
            <AcquisitionProjectionHero projection={projection} />
          ) : null}

          {/* Channel Mix */}
          {!loading && channels.length > 0 && (
            <ChannelMixSection
              channels={channels}
              segmentId={segmentId}
              onExport={handleExport}
              exporting={exporting}
            />
          )}

          {/* AI Search Visibility Teaser */}
          {!loading && <GeoTeaserCard />}

          {/* Ad Campaigns */}
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
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6366f1] mx-auto mb-4"></div>
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
