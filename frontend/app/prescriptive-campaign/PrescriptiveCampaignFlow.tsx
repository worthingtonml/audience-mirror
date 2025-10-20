'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, TrendingUp, Target, DollarSign, Users } from 'lucide-react';

const PLATFORM_META: Record<string, { name: string; color: string; icon: string }> = {
  facebook: { 
    name: "Facebook", 
    color: "#1877F2", 
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
  },
  instagram: { 
    name: "Instagram", 
    color: "#E1306C", 
    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
  },
  tiktok: { 
    name: "TikTok", 
    color: "#000000", 
    icon: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"
  },
  google: { 
    name: "Google Ads", 
    color: "#4285F4", 
    icon: "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
  }
};

export default function CampaignGenerator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [campaignData, setCampaignData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const zip = searchParams.get('zip');
  const cohort = searchParams.get('cohort');
  const procedure = searchParams.get('procedure') || 'botox';

  useEffect(() => {
    if (!zip || !cohort) {
      router.push('/patient-insights');
      return;
    }

    const generateCampaign = async () => {
      try {
        const response = await fetch('/api/campaign-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zip, cohort, procedure }),
        });

        const data = await response.json();
        setCampaignData(data);
        setExpandedPlatform(data.platforms?.[0]?.name); // Auto-expand top platform
      } catch (error) {
        console.error('Failed to generate campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    generateCampaign();
  }, [zip, cohort, procedure, router]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-slate-900">Generating AI-powered campaigns...</div>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">Failed to generate campaign</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to insights
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Campaign Generator</h1>
              <p className="text-slate-600">
                AI-powered recommendations for ZIP {zip} · {cohort} · {procedure}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Campaign ID</div>
              <div className="font-mono text-sm text-slate-900">{campaignData.id}</div>
            </div>
          </div>
        </div>

        {/* Key Insights Banner */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {campaignData.insights?.map((insight: any, idx: number) => (
            <div
              key={idx}
              className={`rounded-lg p-4 ${
                insight.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200'
                  : insight.type === 'warning'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  insight.type === 'success'
                    ? 'text-emerald-900'
                    : insight.type === 'warning'
                    ? 'text-amber-900'
                    : 'text-blue-900'
                }`}
              >
                {insight.text}
              </div>
            </div>
          ))}
        </div>

        {/* Platform Cards - Ranked */}
        <div className="space-y-6 mb-8">
          {campaignData.platforms?.map((platform: any, idx: number) => {
            const meta = PLATFORM_META[platform.name] || PLATFORM_META.facebook;
            const isExpanded = expandedPlatform === platform.name;
            
            return (
              <div 
                key={platform.name} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Platform Header - Always Visible */}
                <div 
                  style={{ backgroundColor: meta.color }} 
                  className="px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedPlatform(isExpanded ? null : platform.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold ${
                          idx === 0
                            ? 'bg-emerald-400 text-emerald-900'
                            : 'bg-white/90 text-slate-700'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" style={{ color: meta.color }} fill="currentColor" viewBox="0 0 24 24">
                          <path d={meta.icon} />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-white capitalize mb-0.5">
                          {platform.name}
                        </div>
                        <div className="flex items-center gap-3 text-white/90 text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="font-semibold">{platform.score}% confidence</span>
                          </div>
                          <span>·</span>
                          <span>ROAS: {platform.metrics.roas}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-white/70">Est. CPL</div>
                        <div className="text-lg font-bold text-white">{platform.metrics.cpl}</div>
                      </div>
                      <button className="text-white/70 hover:text-white">
                        {isExpanded ? '−' : '+'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                  <div className="p-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-6 gap-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: `${meta.color}10` }}>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">CTR</div>
                        <div className="text-lg font-bold text-slate-900">{platform.metrics.ctr}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">CPL Range</div>
                        <div className="text-lg font-bold text-slate-900">{platform.metrics.cpl}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Booking Rate</div>
                        <div className="text-lg font-bold text-slate-900">{platform.metrics.bookingRate}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Max CPA</div>
                        <div className="text-lg font-bold text-slate-900">{platform.metrics.maxCpa}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">LTV</div>
                        <div className="text-lg font-bold text-slate-900">{platform.metrics.ltv}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">ROAS</div>
                        <div className="text-lg font-bold" style={{ color: meta.color }}>{platform.metrics.roas}</div>
                      </div>
                    </div>

                    {/* Ad Copy Variations - Detailed Cards */}
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Ad Copy Variations
                      </div>
                      <div className="space-y-4">
                        {platform.adCopy?.map((copy: string, copyIdx: number) => (
                          <div
                            key={copyIdx}
                            className="relative rounded-xl border-2 p-6 hover:border-slate-300 transition-colors"
                            style={{ borderColor: `${meta.color}20` }}
                          >
                            <button
                              onClick={() => copyToClipboard(copy, `${platform.name}-${copyIdx}`)}
                              className="absolute right-4 top-4 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-95 transition-all"
                              style={{ backgroundColor: meta.color }}
                            >
                              {copied === `${platform.name}-${copyIdx}` ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Copied
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Copy className="h-3 w-3" /> Copy
                                </span>
                              )}
                            </button>
                            <div className="pr-20">
                              <div className="text-xl font-bold text-slate-900 mb-2">{copy}</div>
                              <div className="text-slate-600 leading-relaxed">
                                Transform your look with expert {procedure} treatments. Book your consultation today and experience the difference.
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Targeting & Audiences */}
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                        Targeting Strategy
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {platform.audiences?.map((audience: string, audienceIdx: number) => (
                          <div
                            key={audienceIdx}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                          >
                            {audience}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Creative Guidance */}
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Image Guidelines
                        </div>
                        <ul className="space-y-1.5 text-sm text-slate-700">
                          <li>• Professional treatment photos</li>
                          <li>• Before/after results</li>
                          <li>• Clean, modern aesthetic</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                          Video Concepts
                        </div>
                        <ul className="space-y-1.5 text-sm text-slate-700">
                          <li>• Patient testimonials</li>
                          <li>• Treatment process walkthrough</li>
                          <li>• Expert consultation clips</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Patient Intelligence Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Intelligence Summary</h3>
          <div className="grid grid-cols-5 gap-6">
            <div>
              <div className="text-xs text-slate-500 mb-1">Top ZIP</div>
              <div className="font-mono text-lg font-bold text-slate-900">
                {campaignData.patientIntelligence?.topPerformingZip}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Best Channel</div>
              <div className="text-lg font-bold text-slate-900 capitalize">
                {campaignData.patientIntelligence?.recommendedChannel}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Avg Patient Value</div>
              <div className="text-lg font-bold text-emerald-600">
                ${campaignData.patientIntelligence?.avgPatientValue}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Data Points</div>
              <div className="text-lg font-bold text-slate-900">
                {campaignData.patientIntelligence?.dataPoints}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Confidence</div>
              <div className="text-lg font-bold text-slate-900">
                {campaignData.modelConfidence?.patientDataSupport}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-xs font-semibold text-slate-600 mb-1">Key Pattern</div>
            <div className="text-sm text-slate-900">
              {campaignData.patientIntelligence?.keyPattern}
            </div>
          </div>
        </div>

        {/* Creative Guidance Footer */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-indigo-900 mb-4">Overall Creative Strategy</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-semibold text-indigo-700 mb-2">Primary Message</div>
              <div className="text-sm text-indigo-900">
                {campaignData.creativeGuidance?.primaryMessage}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-indigo-700 mb-2">Visual Style</div>
              <div className="text-sm text-indigo-900">
                {campaignData.creativeGuidance?.visualStyle}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-indigo-700 mb-2">Call-to-Action</div>
              <div className="text-sm text-indigo-900">{campaignData.creativeGuidance?.cta}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-indigo-700 mb-2">Notes</div>
              <div className="text-sm text-indigo-900">{campaignData.creativeGuidance?.notes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}