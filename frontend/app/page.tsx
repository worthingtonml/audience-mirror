'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; 
import { ArrowLeft, Copy, Check, Facebook, Instagram, Search, Target, Lightbulb, TrendingUp, FileText, AlertCircle, ChevronDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CampaignGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ads' | 'messages'>('ads');
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [showOptimizationTips, setShowOptimizationTips] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showKPIs, setShowKPIs] = useState(false);
  
  useEffect(() => {
    const zipCodes = searchParams.get('zip')?.split(',') || [];
    const procedure = searchParams.get('procedure') || 'all';
    const runId = sessionStorage.getItem('runId');
    
    if (!runId) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/runs/${runId}/results`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'done') {
          let selectedSegments = data.top_segments?.filter((seg: any) => 
            zipCodes.includes(seg.zip)
          ) || [];

          // ✅ FIX: If no segments selected, use top 5
          if (selectedSegments.length === 0) {
            console.warn('[CAMPAIGN] No segments selected, using top 5');
            selectedSegments = (data.top_segments || []).slice(0, 5);
          }

          const campaign = generateCampaignFromRealData({
            segments: selectedSegments,
            procedure,
            demographics: data.demographics,
            behaviorPatterns: data.behavior_patterns,
            profileCharacteristics: data.profile_characteristics,
            dominantProfile: data.dominant_profile,
            actualTreatments: data.actual_treatments,
            revenueStats: data.actual_revenue_stats,
            totalPatients: data.patient_count
          });

          setCampaignData(campaign);
          
          // Save to localStorage for landing page builder
          if (typeof window !== 'undefined') {
            localStorage.setItem('audienceMirrorCampaign', JSON.stringify(campaign));
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load campaign data:', err);
        setLoading(false);
      });
  }, [searchParams]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-900 mx-auto mb-4"></div>
          <div className="text-sm font-medium text-slate-900">Generating your data-driven campaign...</div>
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No campaign data available</p>
          <button
            onClick={() => router.push('/patient-insights')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Back to insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to insights</span>
        </button>

        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Your Data-Driven Campaign</h1>
        <p className="text-slate-600 mb-8">
          {campaignData.overview.totalZips} neighborhoods • {campaignData.overview.procedure} • {campaignData.overview.profileType}
        </p>

        {/* Data Quality Indicator - Subtle */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-slate-900">Campaign Personalization</div>
              <div className="text-xs text-slate-500">
                {Object.values(campaignData.dataQuality).filter((d: any) => d.isReal).length}/
                {Object.values(campaignData.dataQuality).length} metrics from your data
              </div>
            </div>
            <button 
              onClick={() => setShowDataQuality(!showDataQuality)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showDataQuality ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {showDataQuality && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {[
                { key: 'patientCount', label: 'Patient Count', format: (v: number) => v.toString() },
                { key: 'age', label: 'Avg Patient Age', format: (v: number) => Math.round(v).toString() },
                { key: 'ltv', label: 'Lifetime Value', format: (v: number) => `$${(v/1000).toFixed(1)}K` },
                { key: 'frequency', label: 'Annual Visits', format: (v: number) => `${v.toFixed(1)}×` },
                { key: 'income', label: 'Avg Income', format: (v: number) => `$${(v/1000).toFixed(0)}K` },
                { key: 'profile', label: 'Patient Profile', format: (v: string) => v.split(' - ')[0] }
              ].map(({ key, label, format }) => {
                const data = campaignData.dataQuality[key];
                return (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      {data.isReal ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm text-slate-700">{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">{format(data.value)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        data.isReal 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {data.isReal ? 'Your data' : 'Industry avg'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {Object.values(campaignData.dataQuality).some((d: any) => !d.isReal) && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      Some metrics use industry averages. For 100% personalized campaigns, ensure your CSV includes patient age, visit history, and revenue per visit.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {(['ads', 'messages'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ads' ? 'Ad Campaigns' : tab}
            </button>
          ))}
          
          {/* Landing Page Builder - Separate Action */}
          <button
            onClick={() => router.push('/landing-page-builder')}
            className="ml-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Build Landing Page →
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'ads' && (
          <>
            {/* Campaign Overview */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Investment & Returns</h2>
              
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    ${(campaignData.overview.monthlyBudget / 1000).toFixed(1)}K
                  </div>
                  <div className="text-xs text-slate-600">Monthly Budget</div>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    {campaignData.overview.expectedPatients}
                  </div>
                  <div className="text-xs text-slate-600">Expected Bookings</div>
                </div>

                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    ${(campaignData.overview.expectedRevenue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-slate-600">Expected Revenue</div>
                </div>
              </div>

              <div className="text-sm text-slate-600 text-center">
                That's a <strong className="text-slate-900">{campaignData.overview.roas}× return</strong> on investment
              </div>
            </div>

            {/* Strategy Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Target className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Campaign Strategy Based on Your Data</h3>
                  <p className="text-sm text-slate-700">{campaignData.strategy.summary}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Primary Message</div>
                  <div className="text-sm font-medium text-slate-900">{campaignData.strategy.primaryMessage}</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs text-slate-600 mb-1">Key Differentiator</div>
                  <div className="text-sm font-medium text-slate-900">{campaignData.strategy.differentiator}</div>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  // Format all campaigns for export
                  const allCampaigns = campaignData.platforms.map((platform: any) => {
                    const platformData = [
                      `\n=== ${platform.name.toUpperCase()} ===`,
                      `Budget: $${(platform.budget / 1000).toFixed(1)}K/month (${platform.allocationPct}%)`,
                      `Strategy: ${platform.strategyDescription}`,
                      `\nADS:\n`
                    ];
                    
                    platform.ads.forEach((ad: any, idx: number) => {
                      platformData.push(
                        `\n--- Ad ${idx + 1}: ${ad.location} ---`,
                        `Targeting: ${ad.targeting}`,
                        `Audience: ${ad.demographics}`,
                        `Daily Budget: $${ad.dailyBudget}`,
                        `Headline: ${ad.headline}`,
                        `Copy: ${ad.copy}`,
                        ad.optimizationTip ? `Tip: ${ad.optimizationTip}` : '',
                        ''
                      );
                    });
                    
                    return platformData.join('\n');
                  }).join('\n\n');

                  const fullExport = [
                    `CAMPAIGN EXPORT - ${campaignData.overview.procedure}`,
                    `Generated: ${new Date().toLocaleDateString()}`,
                    `\nOVERVIEW:`,
                    `Monthly Budget: $${(campaignData.overview.monthlyBudget / 1000).toFixed(1)}K`,
                    `Expected Bookings: ${campaignData.overview.expectedPatients}`,
                    `Expected Revenue: $${(campaignData.overview.expectedRevenue / 1000).toFixed(1)}K`,
                    `ROAS: ${campaignData.overview.roas}×`,
                    `\nSTRATEGY:`,
                    campaignData.strategy.summary,
                    allCampaigns
                  ].join('\n');

                  navigator.clipboard.writeText(fullExport);
                  setCopiedIndex('export-all');
                  setTimeout(() => setCopiedIndex(null), 2000);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {copiedIndex === 'export-all' ? (
                  <><Check className="h-4 w-4" />Copied to clipboard!</>
                ) : (
                  <><Copy className="h-4 w-4" />Export all campaigns</>
                )}
              </button>

              <button
                onClick={() => setShowOptimizationTips(!showOptimizationTips)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
                {showOptimizationTips ? 'Hide' : 'Show'} optimization tips
              </button>
            </div>

            {campaignData.platforms.map((platform: any) => {
              const showAll = expandedPlatforms[platform.name] || false;
              const displayAds = showAll ? platform.ads : platform.ads.slice(0, 3);
            
              return (
                <div key={platform.name} className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
                  {/* Platform Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {platform.icon}
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{platform.name}</h2>
                        <p className="text-sm text-slate-600">{platform.reasoning}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">{platform.allocationPct}%</div>
                      <div className="text-xs text-slate-600">${(platform.budget / 1000).toFixed(1)}K/mo</div>
                    </div>
                  </div>

                  {/* Strategy Banner */}
                  <div className={`rounded-lg p-4 mb-6 ${
                    platform.name === 'Facebook Ads' ? 'bg-blue-50 border border-blue-100' :
                    platform.name === 'Instagram Ads' ? 'bg-purple-50 border border-purple-100' :
                    'bg-indigo-50 border border-indigo-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Target className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        platform.name === 'Facebook Ads' ? 'text-blue-600' :
                        platform.name === 'Instagram Ads' ? 'text-purple-600' :
                        'text-indigo-600'
                      }`} />
                      <div>
                        <div className={`text-sm font-semibold mb-1 ${
                          platform.name === 'Facebook Ads' ? 'text-blue-900' :
                          platform.name === 'Instagram Ads' ? 'text-purple-900' :
                          'text-indigo-900'
                        }`}>
                          {platform.strategyTitle}
                        </div>
                        <div className={`text-sm ${
                          platform.name === 'Facebook Ads' ? 'text-blue-800' :
                          platform.name === 'Instagram Ads' ? 'text-purple-800' :
                          'text-indigo-800'
                        }`}>
                          {platform.strategyDescription}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {displayAds.map((ad: any, index: number) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 mb-1">{ad.location}</div>
                            <div className="text-xs text-slate-600">{ad.targeting}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">${ad.dailyBudget}/day</div>
                            <div className="text-xs text-slate-600">{ad.competitiveNote}</div>
                          </div>
                        </div>

                        {/* In-line Optimization Tip */}
                        {showOptimizationTips && ad.optimizationTip && (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs italic text-amber-900">{ad.optimizationTip}</div>
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <div className="text-xs text-slate-500 uppercase mb-1">Audience</div>
                          <div className="text-sm text-slate-700">{ad.demographics}</div>
                        </div>

                        <div className="mb-3">
                          <div className="text-xs text-slate-500 uppercase mb-1">Headline</div>
                          <div className="text-sm font-medium text-slate-900">{ad.headline}</div>
                        </div>

                        <div className="mb-3">
                          <div className="text-xs text-slate-500 uppercase mb-1">Ad Copy</div>
                          <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded">{ad.copy}</div>
                        </div>

                        <button
                          onClick={() => copyToClipboard(
                            `Platform: ${platform.name}\nLocation: ${ad.location}\nTargeting: ${ad.targeting}\nAudience: ${ad.demographics}\nHeadline: ${ad.headline}\nCopy: ${ad.copy}\nBudget: $${ad.dailyBudget}/day\n\nTip: ${ad.optimizationTip || 'N/A'}`,
                            `${platform.name}-${index}`
                          )}
                          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          {copiedIndex === `${platform.name}-${index}` ? (
                            <><Check className="h-4 w-4" />Copied!</>
                          ) : (
                            <><Copy className="h-4 w-4" />Copy campaign details</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  {platform.ads.length > 3 && (
                    <button
                      onClick={() => setExpandedPlatforms(prev => ({ ...prev, [platform.name]: !showAll }))}
                      className="w-full mt-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {showAll ? 'Show less' : `Show all ${platform.ads.length} neighborhoods`}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Email Templates */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
                  <p className="text-sm text-slate-600 mt-1">Copy, customize, and send</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Referral Request Email */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Referral Request</div>
                      <div className="text-xs text-slate-600">Send to satisfied patients</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `Subject: Share the love - get $100 off your next visit\n\nHi [First Name],\n\nYou're one of our favorite patients, and we'd love to meet more people like you.\n\nRefer a friend and you both get $100 off your next ${campaignData.overview.procedure === 'All Procedures' ? 'treatment' : campaignData.overview.procedure}.\n\nJust have them mention your name when they book their free consultation.\n\nNo limit - refer 3 friends, get $300 off. Simple as that.\n\nThanks for being part of our practice,\n[Your Name]`,
                        'email-referral'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'email-referral' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 space-y-2">
                    <div><strong>Subject:</strong> Share the love - get $100 off your next visit</div>
                    <div className="pt-2 border-t border-slate-200">
                      Hi [First Name],<br/><br/>
                      You're one of our favorite patients, and we'd love to meet more people like you.<br/><br/>
                      Refer a friend and you both get $100 off your next {campaignData.overview.procedure === 'All Procedures' ? 'treatment' : campaignData.overview.procedure}.<br/><br/>
                      Just have them mention your name when they book their free consultation.<br/><br/>
                      No limit - refer 3 friends, get $300 off. Simple as that.<br/><br/>
                      Thanks for being part of our practice,<br/>
                      [Your Name]
                    </div>
                  </div>
                </div>

                {/* Win-Back Email */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Win-Back Campaign</div>
                      <div className="text-xs text-slate-600">For patients who haven't visited in 6+ months</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `Subject: We miss you - come back for 20% off\n\nHi [First Name],\n\nIt's been a while since we've seen you, and we wanted to check in.\n\nLife gets busy - we get it. But your skin (and confidence) deserve some attention.\n\nCome back this month and get 20% off any treatment. No catches, no fine print.\n\nBook your appointment by [Date] and let's get you feeling great again.\n\n[Book Now Button]\n\nLooking forward to seeing you,\n[Your Name]`,
                        'email-winback'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'email-winback' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 space-y-2">
                    <div><strong>Subject:</strong> We miss you - come back for 20% off</div>
                    <div className="pt-2 border-t border-slate-200">
                      Hi [First Name],<br/><br/>
                      It's been a while since we've seen you, and we wanted to check in.<br/><br/>
                      Life gets busy - we get it. But your skin (and confidence) deserve some attention.<br/><br/>
                      Come back this month and get 20% off any treatment. No catches, no fine print.<br/><br/>
                      Book your appointment by [Date] and let's get you feeling great again.<br/><br/>
                      Looking forward to seeing you,<br/>
                      [Your Name]
                    </div>
                  </div>
                </div>

                {/* Review Request Email */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Review Request</div>
                      <div className="text-xs text-slate-600">Send 3-5 days after treatment</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `Subject: How did we do?\n\nHi [First Name],\n\nWe hope you're loving your results!\n\nIf you have 30 seconds, we'd be grateful if you could leave us a quick review. It helps other people find us and decide if we're the right fit.\n\n[Google Review Link]\n\nThanks for trusting us with your care,\n[Your Name]\n\nP.S. If something wasn't perfect, please reply and let us know directly. We want to make it right.`,
                        'email-review'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'email-review' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 space-y-2">
                    <div><strong>Subject:</strong> How did we do?</div>
                    <div className="pt-2 border-t border-slate-200">
                      Hi [First Name],<br/><br/>
                      We hope you're loving your results!<br/><br/>
                      If you have 30 seconds, we'd be grateful if you could leave us a quick review. It helps other people find us and decide if we're the right fit.<br/><br/>
                      [Google Review Link]<br/><br/>
                      Thanks for trusting us with your care,<br/>
                      [Your Name]<br/><br/>
                      P.S. If something wasn't perfect, please reply and let us know directly. We want to make it right.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS Templates */}
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">SMS Templates</h2>
                  <p className="text-sm text-slate-600 mt-1">Keep it short - under 160 characters</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Booking Confirmation */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Booking Confirmation</div>
                      <div className="text-xs text-slate-600">Send immediately after booking</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `You're all set! Your consultation is [Day] at [Time]. Reply CONFIRM or call [Phone] if you need to reschedule. See you soon!`,
                        'sms-confirm'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'sms-confirm' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 font-mono">
                    You're all set! Your consultation is [Day] at [Time]. Reply CONFIRM or call [Phone] if you need to reschedule. See you soon!
                  </div>
                  <div className="text-xs text-slate-600 mt-2">143 characters</div>
                </div>

                {/* Reminder */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Appointment Reminder</div>
                      <div className="text-xs text-slate-600">Send 24 hours before</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `Hi [First Name]! Reminder: Your appointment is tomorrow at [Time]. We're at [Address]. Reply YES to confirm or call [Phone] to reschedule.`,
                        'sms-reminder'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'sms-reminder' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 font-mono">
                    Hi [First Name]! Reminder: Your appointment is tomorrow at [Time]. We're at [Address]. Reply YES to confirm or call [Phone] to reschedule.
                  </div>
                  <div className="text-xs text-slate-600 mt-2">138 characters</div>
                </div>

                {/* Follow-Up */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Post-Treatment Follow-Up</div>
                      <div className="text-xs text-slate-600">Send 2-3 days after treatment</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `Hi [First Name]! How are you feeling after your treatment? Any questions or concerns? Reply here or call [Phone] anytime. - [Your Name]`,
                        'sms-followup'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'sms-followup' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 font-mono">
                    Hi [First Name]! How are you feeling after your treatment? Any questions or concerns? Reply here or call [Phone] anytime. - [Your Name]
                  </div>
                  <div className="text-xs text-slate-600 mt-2">135 characters</div>
                </div>

                {/* Referral SMS */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Referral Request</div>
                      <div className="text-xs text-slate-600">Send to VIP patients</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `[First Name], you're amazing! If you know anyone who'd love our results, refer them & you both get $100 off. Just have them mention your name when booking!`,
                        'sms-referral'
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {copiedIndex === 'sms-referral' ? (
                        <><Check className="h-4 w-4" />Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-sm text-slate-800 font-mono">
                    [First Name], you're amazing! If you know anyone who'd love our results, refer them & you both get $100 off. Just have them mention your name when booking!
                  </div>
                  <div className="text-xs text-slate-600 mt-2">158 characters</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPIs - Collapsible */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setShowKPIs(!showKPIs)}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${showKPIs ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <TrendingUp className={`h-5 w-5 ${showKPIs ? 'text-indigo-600' : 'text-slate-600'}`} />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">Success Metrics to Track</h2>
                <p className="text-sm text-slate-600">{campaignData.kpis.length} KPIs for measuring performance</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${showKPIs ? 'rotate-180' : ''}`} />
          </button>

          {showKPIs && (
            <div className="px-8 pb-8 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                {campaignData.kpis.map((kpi: any, i: number) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-4">
                    <div className="text-sm font-semibold text-slate-900 mb-1">{kpi.metric}</div>
                    <div className="text-xl font-bold text-indigo-600 mb-1">{kpi.target}</div>
                    <div className="text-xs text-slate-600">{kpi.why}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Checklist - Collapsible */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowChecklist(!showChecklist)}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${showChecklist ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <Check className={`h-5 w-5 ${showChecklist ? 'text-indigo-600' : 'text-slate-600'}`} />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">Launch Checklist</h2>
                <p className="text-sm text-slate-600">{campaignData.checklist.length} action items before going live</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${showChecklist ? 'rotate-180' : ''}`} />
          </button>

          {showChecklist && (
            <div className="px-8 pb-8 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                {campaignData.checklist.map((item: string, i: number) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded" />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{item}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => router.push('/patient-insights')}
                className="w-full mt-6 bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Done - Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// FIXED DATA GENERATION - NO MORE $NaNK!
// ================================================================

function generateCampaignFromRealData(params: any) {
  const {
    segments,
    procedure,
    demographics,
    behaviorPatterns,
    profileCharacteristics,
    dominantProfile,
    actualTreatments,
    revenueStats,
    totalPatients
  } = params;

  // ✅ FIX: Validate segments
  if (!segments || segments.length === 0) {
    console.error('[CAMPAIGN] No segments provided');
    return null;
  }

  const validSegments = segments.filter((s: any) => s && typeof s === 'object');
  console.log(`[CAMPAIGN] Processing ${validSegments.length} valid segments`);

  // Track data quality - what's real vs fallback
  const dataQuality = {
    age: { value: demographics?.avg_age || 35, isReal: !!demographics?.avg_age },
    income: { value: profileCharacteristics?.median_income || 75000, isReal: !!profileCharacteristics?.median_income },
    ltv: { value: behaviorPatterns?.avg_lifetime_value || 2500, isReal: !!behaviorPatterns?.avg_lifetime_value },
    frequency: { value: behaviorPatterns?.avg_visits_per_year || 2.5, isReal: !!behaviorPatterns?.avg_visits_per_year },
    profile: { value: dominantProfile?.combined || 'Your Patient Base', isReal: !!dominantProfile?.combined },
    patientCount: { value: totalPatients || 50, isReal: !!totalPatients && totalPatients > 0 }
  };

  const avgAge = dataQuality.age.value;
  const avgIncome = dataQuality.income.value;
  const avgLTV = dataQuality.ltv.value;
  const avgFrequency = dataQuality.frequency.value;
  const topTreatments = Object.keys(actualTreatments || {}).slice(0, 3);
  const profileType = dataQuality.profile.value;
  
  // ✅ FIX: Safe competition calculation
  const avgCompetition = validSegments.length > 0
    ? validSegments.reduce((sum: number, s: any) => sum + (Number(s.competitors) || 0), 0) / validSegments.length
    : 2;

  // ✅ FIX: Safe CPA calculation with fallback
  const cpaValues = validSegments
    .map((s: any) => Number(s.cpa_target) || 0)
    .filter((v: number) => v > 0);
  
  const avgCPA = cpaValues.length > 0
    ? cpaValues.reduce((sum: number, val: number) => sum + val, 0) / cpaValues.length
    : 150;

  // ✅ FIX: Safe bookings & revenue calculation
  const totalBookings = validSegments.reduce((sum: number, s: any) => sum + (Number(s.expected_bookings) || 0), 0);
  const totalRevenue = validSegments.reduce((sum: number, s: any) => sum + (Number(s.expected_monthly_revenue) || 0), 0);

  // ✅ FIX: Calculate budget with validation
  const monthlyBudget = totalBookings > 0 && avgCPA > 0
    ? Math.round(avgCPA * totalBookings)
    : 5000;

  console.log(`[CAMPAIGN] Budget: ${totalBookings} bookings × $${avgCPA.toFixed(0)} CPA = $${monthlyBudget}`);

  // ✅ FIX: Final NaN check
  if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
    console.error('[CAMPAIGN] Invalid budget calculated');
    return null;
  }

  let fbPct = 0.35, igPct = 0.35, googlePct = 0.30;
  
  if (avgAge) {
    if (avgAge < 35) { igPct = 0.45; fbPct = 0.25; }
    else if (avgAge > 45) { fbPct = 0.45; igPct = 0.25; }
  }
  
  if (avgCompetition > 3) {
    googlePct = 0.40;
    fbPct -= 0.05;
    igPct -= 0.05;
  }

  // Generate data-driven optimization tips based on behavioral patterns
  const generateOptimizationTips = (platform: string, segment: any) => {
    const tips: Record<string, string[]> = {
      facebook: [],
      instagram: [],
      google: []
    };

    // Behavioral insights
    if (avgFrequency > 3) {
      tips.facebook.push(`Your patients visit ${avgFrequency.toFixed(1)}× yearly. Highlight package deals and VIP memberships—frequent visitors respond to loyalty incentives.`);
      tips.instagram.push(`High visit frequency (${avgFrequency.toFixed(1)}×/year) means strong engagement. Show treatment progressions over time, not just one-time transformations.`);
      tips.google.push(`Frequent visitors (${avgFrequency.toFixed(1)}×/year) search for "maintenance" keywords. Bid on "${procedure} maintenance" and "${procedure} touch-up" terms.`);
    } else if (avgFrequency < 2) {
      tips.facebook.push(`Low visit frequency (${avgFrequency.toFixed(1)}×/year) suggests one-time buyers. Use aggressive first-visit discounts to overcome trial barrier.`);
      tips.instagram.push(`Patients visit infrequently (${avgFrequency.toFixed(1)}×/year). Focus on dramatic single-treatment results, not ongoing relationships.`);
    }

    // LTV-based positioning
    if (avgLTV > 5000) {
      tips.facebook.push(`High LTV ($${(avgLTV/1000).toFixed(1)}K) patients respond to premium positioning. Avoid discount language—emphasize expertise, safety, and personalized care.`);
      tips.instagram.push(`Your patients spend $${(avgLTV/1000).toFixed(1)}K lifetime. Use aspirational, polished imagery. Stock photos signal low-quality—use real office/staff photos.`);
      tips.google.push(`High-value patients ($${(avgLTV/1000).toFixed(1)}K LTV) convert on trust signals. Add "Board-certified" and "20+ years experience" to ad copy.`);
    } else if (avgLTV < 2000) {
      tips.facebook.push(`Lower LTV ($${(avgLTV/1000).toFixed(1)}K) means price-sensitive buyers. Lead with specific dollar amounts: "Only $299" outperforms "Affordable ${procedure}".`);
      tips.instagram.push(`Price-conscious segment ($${(avgLTV/1000).toFixed(1)}K LTV). Show clear pricing in ads. Use "Starting at $X" to set expectations upfront.`);
    }

    // Psychographic profile insights
    if (profileType.includes('Young Professional')) {
      tips.facebook.push(`Young Professionals value convenience and speed. Emphasize "Same-week appointments" and "Online booking" in all ads.`);
      tips.instagram.push(`Young Professionals check Instagram during lunch breaks. Schedule posts 11am-2pm and 5-7pm for 40% higher engagement.`);
      tips.google.push(`Young Professionals search mobile-first. Ensure click-to-call is prominent. "Book by text" increases conversions by 35%.`);
    } else if (profileType.includes('Established Professional')) {
      tips.facebook.push(`Established Professionals trust peer recommendations. Use testimonials from similar demographics: "${avgAge}+ professionals".`);
      tips.instagram.push(`Established Professionals value discretion. Avoid overly promotional tone—focus on natural results and subtle enhancements.`);
      tips.google.push(`Established Professionals search during work hours. Increase bids 9am-5pm weekdays when this segment is most active.`);
    } else if (profileType.includes('Suburban')) {
      tips.facebook.push(`Suburban patients prioritize family schedules. Highlight "Evening and weekend hours available" to capture this segment.`);
      tips.google.push(`Suburban searchers often include spouse in decision. Landing pages should address safety and recovery time concerns.`);
    }

    // Treatment mix insights
    if (topTreatments.length >= 2) {
      const treatment1 = topTreatments[0];
      const treatment2 = topTreatments[1];
      tips.facebook.push(`Your patients often combine ${treatment1} + ${treatment2}. Advertise bundle pricing: "Save $200 when you combine treatments."`);
      tips.instagram.push(`Cross-service behavior: ${treatment1} patients often add ${treatment2}. Create carousel showing both results together.`);
    }

    // Age-specific tactics
    if (avgAge && avgAge > 50) {
      tips.facebook.push(`Age ${Math.round(avgAge)}+ responds to authority. Use "Dr." title and credentials prominently. Avoid casual language.`);
      tips.google.push(`${Math.round(avgAge)}+ searchers prefer phone calls to forms. Add call extensions and "Call now for consultation" to every ad.`);
    } else if (avgAge && avgAge < 35) {
      tips.instagram.push(`Age ${Math.round(avgAge)} expects instant gratification. Show "Book appointment" button in first frame. Remove friction.`);
      tips.google.push(`${Math.round(avgAge)}s book impulsively. Highlight "Next available: Today 3pm" dynamic availability to capitalize on urgency.`);
    }

    // Competition-specific tactics (secondary to behavioral)
    if (segment.competitors === 0) {
      tips.facebook.push(`Virgin market opportunity. Spend 40% of budget capturing local search demand before competitors enter.`);
      tips.google.push(`Zero competition = $2-5 CPC. Bid aggressively on generic terms while costs are low. Lock in market share.`);
    } else if (segment.competitors > 3) {
      tips.google.push(`${segment.competitors} competitors in ${segment.zip}. Focus on unique differentiators: specific certifications, exclusive techniques, or guarantee offers.`);
    }

    return tips;
  };

  const allTips = validSegments.length > 0 ? generateOptimizationTips('all', validSegments[0]) : { facebook: [], instagram: [], google: [] };

  const platforms = [
    {
      name: 'Facebook Ads',
      icon: <Facebook className="h-6 w-6 text-blue-600" />,
      reasoning: `${Math.round(fbPct * 100)}% - ${avgAge ? (avgAge > 40 ? `Patients ${avgAge}+ (FB core)` : 'Local reach') : 'Local awareness'}`,
      strategyTitle: avgFrequency > 3 ? 'Facebook: Loyalty & Frequency' : 'Facebook: New Patient Acquisition',
      strategyDescription: avgFrequency > 3
        ? `Your patients visit ${avgFrequency.toFixed(1)}× yearly, making them ideal for Facebook's retargeting. Use lookalike audiences based on your frequent visitors to find similar high-value patients. Focus on package deals and VIP memberships.`
        : avgLTV > 5000
        ? `High-value patients ($${(avgLTV/1000).toFixed(1)}K LTV) require trust-building before conversion. Use Facebook for educational content, testimonials, and office tours. Multi-touch attribution shows 5-7 exposures before booking.`
        : `${profileType} segment responds to social proof and local relevance. Facebook's detailed targeting captures your demographic while they're browsing, building awareness for Google Search conversions later.`,
      budget: Math.round(monthlyBudget * fbPct),
      allocationPct: Math.round(fbPct * 100),
      ads: validSegments.map((seg: any, idx: number) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `${seg.zip} + ${seg.distance_miles < 5 ? '3' : '5'} mile radius`,
        demographics: `Ages ${avgAge ? avgAge - 10 : 30}-${avgAge ? avgAge + 15 : 55}, Income $${seg.median_income >= 100000 ? '100k+' : '75k+'}`,
        headline: seg.competitors === 0 ? `First ${procedure} in ${seg.zip}` : `Expert ${procedure} in ${seg.zip}`,
        copy: seg.competitors === 0 
          ? `Be first in ${seg.zip}. Limited introductory pricing. Book now →`
          : `Join ${totalPatients}+ patients. ${profileType.split(' - ')[0]} trust us. Book today.`,
        dailyBudget: Math.round((monthlyBudget * fbPct) / 30 / validSegments.length),
        competitiveNote: seg.competitors > 3 ? 'High competition' : seg.competitors === 0 ? 'Virgin market' : 'Low competition',
        optimizationTip: allTips.facebook[idx % allTips.facebook.length] || allTips.facebook[0]
      }))
    },
    {
      name: 'Instagram Ads',
      icon: <Instagram className="h-6 w-6 text-pink-600" />,
      reasoning: `${Math.round(igPct * 100)}% - ${avgAge && avgAge < 35 ? `Patients ${avgAge}+ (IG strength)` : 'Visual results'}`,
      strategyTitle: avgAge && avgAge < 35 ? 'Instagram: Your Core Demographic' : 'Instagram: Visual Proof & Awareness',
      strategyDescription: avgAge && avgAge < 35
        ? `Age ${Math.round(avgAge)} is Instagram's highest engagement bracket. Your patients are scrolling during commutes and breaks. Use Stories for flash offers, Feed for credibility. Before/after carousels outperform single-image ads by 60%.`
        : topTreatments.length >= 2
        ? `Your patients often combine ${topTreatments[0]} + ${topTreatments[1]}. Instagram is perfect for showcasing multi-treatment transformations. Use carousel ads: slide 1 = problem, slide 2 = treatment A result, slide 3 = added treatment B, slide 4 = final result + CTA.`
        : `Visual platform ideal for ${procedure} results. Instagram builds awareness and desire—patients may not book immediately but will search your name on Google later. Use this channel for brand equity, not immediate conversions.`,
      budget: Math.round(monthlyBudget * igPct),
      allocationPct: Math.round(igPct * 100),
      ads: validSegments.map((seg: any, idx: number) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `${seg.zip} + 3 mile radius`,
        demographics: `Ages ${avgAge ? avgAge - 15 : 25}-${avgAge ? avgAge + 5 : 45}, Beauty enthusiasts`,
        headline: `✨ Real ${procedure} Results`,
        copy: `See transformations from ${seg.zip} patients. Swipe for before & after. Book now →`,
        dailyBudget: Math.round((monthlyBudget * igPct) / 30 / validSegments.length),
        competitiveNote: seg.competitors > 3 ? 'Stand out visually' : 'Build awareness',
        optimizationTip: allTips.instagram[idx % allTips.instagram.length] || allTips.instagram[0]
      }))
    },
    {
      name: 'Google Search',
      icon: <Search className="h-6 w-6 text-slate-700" />,
      reasoning: `${Math.round(googlePct * 100)}% - ${avgCompetition > 3 ? 'Critical for competition' : 'High-intent capture'}`,
      strategyTitle: avgCompetition > 3 ? 'Google: Bottom-Funnel Capture' : 'Google: Low-Cost Conversions',
      strategyDescription: avgCompetition > 3
        ? `With ${Math.round(avgCompetition)} competitors, Google Search is your conversion engine. Patients searching "${procedure} near me" are ready to book. These leads close 2-3× faster than social traffic. Your ${profileType} patients research heavily before booking—dominate the consideration phase.`
        : avgFrequency > 3
        ? `Low competition + frequent visitors = search for maintenance terms. Your patients visit ${avgFrequency.toFixed(1)}×/year, meaning they search "${procedure} maintenance", "touch-up", and "${procedure} how often" queries. Capture repeat business through search.`
        : `Low competition means CPC under $5. Capture 100% of local search demand before competitors enter. Google converts fastest—patients actively searching are bottom-of-funnel. Emphasize immediate availability: "Same-week appointments available."`,
      budget: Math.round(monthlyBudget * googlePct),
      allocationPct: Math.round(googlePct * 100),
      ads: validSegments.map((seg: any, idx: number) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `"${procedure} near me", "${procedure} ${seg.zip}"`,
        demographics: `High-intent searchers in ${seg.zip}`,
        headline: `${procedure} in ${seg.zip}`,
        copy: seg.competitors === 0
          ? `First ${procedure} in ${seg.zip}. Same-week appointments. Book online.`
          : `Top-rated ${procedure}. ${seg.competitors > 3 ? 'Most experienced.' : 'Proven results.'} Book today.`,
        dailyBudget: Math.round((monthlyBudget * googlePct) / 30 / validSegments.length),
        competitiveNote: seg.competitors > 3 ? 'Bid aggressively' : 'Low CPC',
        optimizationTip: allTips.google[idx % allTips.google.length] || allTips.google[0]
      }))
    }
  ];

  const roas = totalRevenue > 0 && monthlyBudget > 0 
    ? (totalRevenue / monthlyBudget).toFixed(1)
    : '5.0';

  return {
    dataQuality,
    overview: {
      totalZips: validSegments.length,
      procedure: procedure === 'all' ? 'All Procedures' : procedure,
      profileType,
      monthlyBudget,
      expectedPatients: totalBookings,
      expectedRevenue: totalRevenue,
      roas
    },
    strategy: {
      summary: `${profileType}${avgLTV ? `, $${(avgLTV/1000).toFixed(1)}K LTV` : ''}${avgFrequency ? `, ${avgFrequency.toFixed(1)}× yearly` : ''}. ${avgCompetition > 3 ? 'High competition requires search focus.' : 'Low competition allows brand building.'}`,
      primaryMessage: avgCompetition > 3 ? 'Most experienced in area' : 'Locally trusted',
      differentiator: avgLTV > 5000 ? 'Premium experience' : 'Exceptional care'
    },
    platforms,
    creative: {
      visualStyle: avgIncome > 120000 ? 'Luxury aesthetic - clean, minimal' : 'Aspirational yet approachable',
      visualKeywords: avgIncome > 120000 ? ['Minimal', 'Elegant', 'High-end'] : ['Warm', 'Inviting', 'Professional'],
      imageGuidelines: [
        `Show real ${procedure} results`,
        avgAge ? `Feature patients ages ${avgAge - 10}-${avgAge + 15}` : 'Feature diverse patients',
        'Bright, natural lighting',
        'Show your actual office'
      ],
      tone: avgIncome > 120000 ? 'Sophisticated and understated' : 'Friendly and confident',
      dos: ['Lead with results', 'Mention credentials', avgIncome > 120000 ? 'Emphasize personalized service' : 'Highlight value', 'Use testimonials'],
      donts: ['No stock photos', 'No aggressive language', 'No medical jargon', 'No competitor names']
    },
    offers: {
      primary: {
        title: avgCompetition > 3 ? 'Free Consultation + $200 Credit' : 'Complimentary Consultation',
        description: avgCompetition > 3 ? 'Risk-free consultation plus $200 credit.' : 'No-cost consultation with treatment plan.',
        reasoning: avgCompetition > 3 ? 'High competition requires aggressive offers' : 'Low competition allows softer approach'
      },
      alternatives: [
        {
          segment: avgFrequency > 3 ? 'Frequent visitors' : 'New patients',
          offer: avgFrequency > 3 ? 'VIP Membership - 15% off' : 'New Patient - 20% off',
          rationale: avgFrequency > 3 ? `Patients visit ${avgFrequency.toFixed(1)}× yearly` : 'Lower barrier for new patients'
        },
        {
          segment: avgLTV > 5000 ? 'High-value' : 'Budget-conscious',
          offer: avgLTV > 5000 ? 'Package deal - 10% off' : 'Payment plans - 0% APR',
          rationale: avgLTV > 5000 ? `High LTV ($${(avgLTV/1000).toFixed(1)}K)` : 'Remove price objection'
        }
      ],
      pricingPsychology: revenueStats?.mean > 2000
        ? `Average transaction $${Math.round(revenueStats.mean)}. Anchor high, show savings.`
        : 'Lead with monthly payments rather than total price.'
    },
    landing: {
      headline: avgCompetition === 0 ? `First ${procedure} Serving Your Area` : `${profileType.split(' - ')[0]}' Choice for ${procedure}`,
      subheadline: avgCompetition === 0 ? 'Be among the first. Limited introductory pricing.' : `Join ${totalPatients}+ satisfied patients.`,
      trustBuilders: [
        `${totalPatients}+ successful treatments`,
        avgCompetition > 3 ? `Most experienced among ${Math.round(avgCompetition)} providers` : 'Board-certified practitioners',
        'Same-week appointments',
        'Free consultation'
      ],
      cta: { primary: 'Book Free Consultation', secondary: 'Call Now' },
      formFields: ['Name', 'Phone', 'Email', 'Preferred time']
    },
    kpis: [
      { metric: 'Cost Per Lead', target: `$${Math.round(avgCPA * 0.6)}`, why: 'Track ad efficiency' },
      { metric: 'Lead Volume', target: `${Math.round(monthlyBudget / (avgCPA * 0.6))}/mo`, why: 'Pipeline health' },
      { metric: 'Consultation Rate', target: '35%', why: 'Lead quality' },
      { metric: 'Booking Rate', target: '65%', why: 'Conversion rate' },
      { metric: 'Cost Per Acquisition', target: `$${Math.round(avgCPA)}`, why: 'True patient cost' },
      { metric: 'ROAS', target: '5.0×', why: 'Campaign profitability' }
    ],
    checklist: [
      'Set up Facebook, Instagram, and Google ad accounts',
      'Install conversion tracking pixels',
      'Create dedicated landing page',
      'Set up call tracking',
      'Configure daily budget caps',
      'Set up consultation reminders',
      'Create retargeting audiences',
      'Schedule weekly reviews'
    ]
  };
}
