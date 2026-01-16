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
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-gray-600" />
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />

      <div className="p-6">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-4">
          What this campaign can add each month
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-6 pb-6 mb-4 border-b border-gray-100">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(projection.projectedRevenueMonthly)}
            </span>
            <span className="text-gray-400 text-sm">revenue</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(projection.projectedAdSpendMonthly)}
            </span>
            <span className="text-gray-400 text-sm">ad spend</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">
              {projection.projectedReturnMultiple.toFixed(1)}×
            </span>
            <span className="text-gray-400 text-sm">estimated return</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              ${Math.round(projection.projectedAdSpendMonthly / 30)}
            </span>
            <span className="text-gray-400 text-sm">per day</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm">
          from {projection.projectedNewPatientsMonthly} new VIP patients · Estimate based on similar medspa campaigns in markets like yours
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// VIP SECTION
// ============================================================================

type VIPSectionProps = {
  vipData: any;
};

function VIPSection({ vipData }: VIPSectionProps) {
  const router = useRouter();

  if (!vipData || !vipData.summary) return null;

  const { summary } = vipData;
  const avgBestValue = summary.avgBestPatientValue || 0;
  const avgOverallValue = summary.avgOverallValue || 1;
  const multiplier = avgOverallValue > 0 ? (avgBestValue / avgOverallValue).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                VIP Patients
              </span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full">
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
                    <li>• VIPs generate {summary.revenueConcentration}% of total revenue</li>
                    <li>• Avg VIP spends ${Math.round(avgBestValue).toLocaleString()} vs ${Math.round(avgOverallValue).toLocaleString()} overall</li>
                  </ul>
                  <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 rotate-45" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {summary.bestPatientCount} high-value patients
            </h3>
          </div>
          <button
            onClick={() => router.push('/patient-insights')}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            View All VIPs
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg VIP LTV</p>
            <p className="text-2xl font-bold text-gray-900">${Math.round(avgBestValue / 1000).toFixed(1)}K</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Overall</p>
            <p className="text-2xl font-bold text-gray-900">${Math.round(avgOverallValue / 1000).toFixed(1)}K</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">VIP Multiplier</p>
            <p className="text-2xl font-bold text-emerald-600">{multiplier}×</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Revenue Share</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.revenueConcentration}%</p>
          </div>
        </div>
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

function ChannelMixSection({ channels, segmentId, onExport, exporting }: ChannelMixSectionProps) {
  const channelConfig: Record<ChannelKey, { iconBg: string; iconText: string; icon: string }> = {
    facebook: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', icon: 'f' },
    instagram: { iconBg: 'bg-pink-100', iconText: 'text-pink-600', icon: '📷' },
    google: { iconBg: 'bg-gray-100', iconText: 'text-gray-700', icon: 'G' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Where to find more patients like your best ones
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        Use this mix as a starting point. You can still adjust budgets in Facebook, Instagram, and Google later.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {channels.map((channel) => {
          const config = channelConfig[channel.id];
          return (
            <div key={channel.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${config.iconBg} rounded-lg flex items-center justify-center`}>
                  <span className={`${config.iconText} font-bold text-sm`}>{config.icon}</span>
                </div>
                <span className="font-medium text-gray-900">{channel.label}</span>
              </div>
              <p className="text-emerald-600 font-semibold">{channel.budgetSharePercent}% of budget</p>
              <p className="text-gray-500 text-sm">{channel.role}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
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

  const channelConfig: Record<ChannelKey, { iconBg: string; iconText: string; icon: string }> = {
    facebook: { iconBg: 'bg-blue-100', iconText: 'text-blue-600', icon: 'f' },
    instagram: { iconBg: 'bg-pink-100', iconText: 'text-pink-600', icon: '📷' },
    google: { iconBg: 'bg-gray-100', iconText: 'text-gray-700', icon: 'G' },
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
          <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center`}>
            <span className={`${config.iconText} font-bold`}>{config.icon}</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{channel.label}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {channel.budgetSharePercent}% of budget · ${channel.dailyBudget}/day
              </span>
            </div>
            <p className="text-gray-500 text-sm">{channel.role}</p>
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

          {/* VIP Section */}
          {!loading && vipData && <VIPSection vipData={vipData} />}

          {/* Channel Mix */}
          {!loading && channels.length > 0 && (
            <ChannelMixSection
              channels={channels}
              segmentId={segmentId}
              onExport={handleExport}
              exporting={exporting}
            />
          )}

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
