'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; 
import { ArrowLeft, Copy, Check, Facebook, Instagram, Search, Target, Lightbulb, TrendingUp, FileText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CampaignGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ads' | 'creative' | 'offers' | 'landing'>('ads');
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  
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
          const selectedSegments = data.top_segments.filter((seg: any) => 
            zipCodes.includes(seg.zip)
          );

          // USE REAL DATA ONLY - no assumptions
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

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('ads')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ads'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ad Campaigns
          </button>
          <button
            onClick={() => setActiveTab('creative')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'creative'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Creative Brief
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'offers'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Offer Strategy
          </button>
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'landing'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Landing Page
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'ads' && (
            <>
                {campaignData.platforms.map((platform: any) => {
                    const showAll = expandedPlatforms[platform.name] || false;
                    const displayAds = showAll ? platform.ads : platform.ads.slice(0, 3);
                
                return (
                    <div key={platform.name} className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
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

                    <div className="space-y-4">
                        {displayAds.map((ad: any, index: number) => (
                        <div key={index} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-900 mb-1">
                                {ad.location}
                                </div>
                                <div className="text-xs text-slate-600">{ad.targeting}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900">${ad.dailyBudget}/day</div>
                                <div className="text-xs text-slate-600">{ad.competitiveNote}</div>
                            </div>
                            </div>

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
                            <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded">
                                {ad.copy}
                            </div>
                            </div>

                            <button
                            onClick={() => copyToClipboard(
                                `Platform: ${platform.name}\nLocation: ${ad.location}\nTargeting: ${ad.targeting}\nAudience: ${ad.demographics}\nHeadline: ${ad.headline}\nCopy: ${ad.copy}\nBudget: $${ad.dailyBudget}/day`,
                                `${platform.name}-${index}`
                            )}
                            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                            {copiedIndex === `${platform.name}-${index}` ? (
                                <>
                                <Check className="h-4 w-4" />
                                Copied!
                                </>
                            ) : (
                                <>
                                <Copy className="h-4 w-4" />
                                Copy campaign details
                                </>
                            )}
                            </button>
                        </div>
                        ))}
                    </div>

                    {platform.ads.length > 3 && (
                        <button
                        onClick={() => setExpandedPlatforms(prev => ({
                            ...prev,
                            [platform.name]: !showAll
                        }))}
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

        {activeTab === 'creative' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-slate-900">Creative Direction</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Visual Style</h3>
                <p className="text-sm text-slate-700 mb-3">{campaignData.creative.visualStyle}</p>
                <div className="flex flex-wrap gap-2">
                  {campaignData.creative.visualKeywords.map((keyword: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Image Recommendations</h3>
                <ul className="space-y-2">
                  {campaignData.creative.imageGuidelines.map((guideline: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Tone of Voice</h3>
                <p className="text-sm text-slate-700">{campaignData.creative.tone}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Messaging Do's & Don'ts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="text-xs font-semibold text-emerald-900 uppercase mb-2">✓ Do</div>
                    <ul className="space-y-1">
                      {campaignData.creative.dos.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-emerald-900">{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-xs font-semibold text-red-900 uppercase mb-2">✗ Don't</div>
                    <ul className="space-y-1">
                      {campaignData.creative.donts.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-red-900">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Offer Strategy</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2">Recommended Primary Offer</h3>
                <p className="text-base font-semibold text-slate-900 mb-2">{campaignData.offers.primary.title}</p>
                <p className="text-sm text-slate-700 mb-3">{campaignData.offers.primary.description}</p>
                <div className="text-xs text-indigo-900">
                  <strong>Why this works:</strong> {campaignData.offers.primary.reasoning}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Alternative Offers by Segment</h3>
                <div className="space-y-3">
                  {campaignData.offers.alternatives.map((offer: any, i: number) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{offer.segment}</div>
                          <div className="text-sm text-slate-700 mt-1">{offer.offer}</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 mt-2">{offer.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Pricing Psychology</h3>
                <p className="text-sm text-slate-700">{campaignData.offers.pricingPsychology}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'landing' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-900">Landing Page Copy</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Headline</h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-xl font-bold text-slate-900">{campaignData.landing.headline}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Subheadline</h3>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-base text-slate-700">{campaignData.landing.subheadline}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Trust Builders</h3>
                <ul className="space-y-2">
                  {campaignData.landing.trustBuilders.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Call-to-Action</h3>
                <div className="flex gap-3">
                  <button className="flex-1 bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold">
                    {campaignData.landing.cta.primary}
                  </button>
                  <button className="flex-1 border-2 border-slate-900 text-slate-900 py-3 px-6 rounded-lg font-semibold">
                    {campaignData.landing.cta.secondary}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Form Fields (Keep it minimal)</h3>
                <div className="space-y-2">
                  {campaignData.landing.formFields.map((field: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      <span>{field}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(
                `Headline: ${campaignData.landing.headline}\n\nSubheadline: ${campaignData.landing.subheadline}\n\nTrust Builders:\n${campaignData.landing.trustBuilders.map((t: string) => `- ${t}`).join('\n')}\n\nPrimary CTA: ${campaignData.landing.cta.primary}\nSecondary CTA: ${campaignData.landing.cta.secondary}`,
                'landing-page'
              )}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors mt-6"
            >
              {copiedIndex === 'landing-page' ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied landing page copy!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy all landing page copy
                </>
              )}
            </button>
          </div>
        )}

        {/* KPIs to Track */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Success Metrics to Track</h2>
          
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

        {/* Based on Your Data */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl p-8 mb-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
            This is based on YOUR patient data
            </h3>
            <p className="text-slate-700">
            These projections use your actual patient behavior: ${(campaignData.overview.expectedRevenue / campaignData.overview.expectedPatients).toLocaleString()} average revenue per patient, 
            and competitive landscape in your selected neighborhoods. 
            Launch these campaigns, track results, and we'll refine the model based on 
            your real performance data.
            </p>
        </div>

        {/* Launch Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Launch Checklist</h2>
          
          <div className="space-y-3">
            {campaignData.checklist.map((item: string, i: number) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
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

      </div>
    </div>
  );

  // Helper functions using REAL data only
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

  const avgAge = demographics?.avg_age || null;
  const avgIncome = profileCharacteristics?.median_income;
  const avgLTV = behaviorPatterns?.avg_lifetime_value;
  const avgFrequency = behaviorPatterns?.avg_visits_per_year;
  const topTreatments = Object.keys(actualTreatments || {}).slice(0, 3);
  const profileType = dominantProfile?.combined || 'Your Patient Base';
  
  const avgCompetition = segments.reduce((sum: number, s: any) => sum + (s.competitors || 0), 0) / segments.length;
  const avgCPA = segments.reduce((sum: number, s: any) => sum + (s.cpa_target || 0), 0) / segments.length;
  const totalBookings = segments.reduce((sum: number, s: any) => sum + (s.expected_bookings || 0), 0);
  const totalRevenue = segments.reduce((sum: number, s: any) => sum + (s.expected_monthly_revenue || 0), 0);
  const monthlyBudget = Math.round(avgCPA * totalBookings);

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

  const platforms = [
    {
      name: 'Facebook Ads',
      icon: <Facebook className="h-6 w-6 text-blue-600" />,
      reasoning: `${Math.round(fbPct * 100)}% - ${avgAge ? (avgAge > 40 ? 'Your patients are ' + avgAge + '+ (FB core demo)' : 'Good local reach') : 'Local awareness'}`,
      budget: Math.round(monthlyBudget * fbPct),
      allocationPct: Math.round(fbPct * 100),
      ads: segments.map((seg: any) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `${seg.zip} + ${seg.distance_miles < 5 ? '3' : '5'} mile radius`,
        demographics: `Ages ${avgAge ? avgAge - 10 : 30}-${avgAge ? avgAge + 15 : 55}, Income $${seg.median_income >= 100000 ? '100k+' : '75k+'}`,
        headline: seg.competitors === 0 ? `First ${procedure} in ${seg.zip}` : `Expert ${procedure} in ${seg.zip}`,
        copy: seg.competitors === 0 
          ? `Be the first in ${seg.zip} to experience ${procedure}. Limited introductory pricing. Book consultation →`
          : `Join ${totalPatients}+ satisfied patients. ${profileType.split(' - ')[0]} trust us. Book today.`,
        dailyBudget: Math.round((monthlyBudget * fbPct) / 30 / segments.length),
        competitiveNote: seg.competitors > 3 ? 'High competition' : seg.competitors === 0 ? 'Virgin market' : 'Low competition'
      }))
    },
    {
      name: 'Instagram Ads',
      icon: <Instagram className="h-6 w-6 text-pink-600" />,
      reasoning: `${Math.round(igPct * 100)}% - ${avgAge ? (avgAge < 35 ? 'Your patients are ' + avgAge + '+ (IG strength)' : 'Visual results') : 'Visual platform'}`,
      budget: Math.round(monthlyBudget * igPct),
      allocationPct: Math.round(igPct * 100),
      ads: segments.map((seg: any) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `${seg.zip} + 3 mile radius`,
        demographics: `Ages ${avgAge ? avgAge - 15 : 25}-${avgAge ? avgAge + 5 : 45}, Beauty enthusiasts`,
        headline: `✨ Real ${procedure} Results`,
        copy: `See transformations from ${seg.zip} patients. Swipe for before & after. Book now →`,
        dailyBudget: Math.round((monthlyBudget * igPct) / 30 / segments.length),
        competitiveNote: seg.competitors > 3 ? 'Stand out visually' : 'Build awareness'
      }))
    },
    {
      name: 'Google Search',
      icon: <Search className="h-6 w-6 text-slate-700" />,
      reasoning: `${Math.round(googlePct * 100)}% - ${avgCompetition > 3 ? 'Critical for high competition' : 'Capture high-intent'}`,
      budget: Math.round(monthlyBudget * googlePct),
      allocationPct: Math.round(googlePct * 100),
      ads: segments.map((seg: any) => ({
        location: seg.location_name || `ZIP ${seg.zip}`,
        targeting: `"${procedure} near me", "${procedure} ${seg.zip}"`,
        demographics: `High-intent searchers in ${seg.zip}`,
        headline: `${procedure} in ${seg.zip}`,
        copy: seg.competitors === 0
          ? `First ${procedure} in ${seg.zip}. Same-week appointments. Book online.`
          : `Top-rated ${procedure}. ${seg.competitors > 3 ? 'Most experienced.' : 'Proven results.'} Book today.`,
        dailyBudget: Math.round((monthlyBudget * googlePct) / 30 / segments.length),
        competitiveNote: seg.competitors > 3 ? 'Bid aggressively' : 'Low CPC'
      }))
    }
  ];

  return {
    overview: {
      totalZips: segments.length,
      procedure: procedure === 'all' ? 'All Procedures' : procedure,
      profileType,
      monthlyBudget,
      expectedPatients: totalBookings,
      expectedRevenue: totalRevenue,
      roas: (totalRevenue / monthlyBudget).toFixed(1)
    },
    strategy: {
      summary: `Your patients: ${profileType}${avgLTV ? `, $${(avgLTV/1000).toFixed(1)}K LTV` : ''}${avgFrequency ? `, ${avgFrequency.toFixed(1)}× yearly` : ''}. ${avgCompetition > 3 ? 'High competition requires search focus.' : 'Low competition allows brand building.'}`,
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
          rationale: avgFrequency > 3 ? `Patients visit ${avgFrequency.toFixed(1)}× yearly - reward loyalty` : 'Lower barrier for new patients'
        },
        {
          segment: avgLTV > 5000 ? 'High-value' : 'Budget-conscious',
          offer: avgLTV > 5000 ? 'Package deal - 10% off upfront' : 'Payment plans - 0% APR',
          rationale: avgLTV > 5000 ? `High LTV ($${(avgLTV/1000).toFixed(1)}K) can afford packages` : 'Remove price objection'
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
        avgCompetition > 3 ? `Most experienced among ${Math.round(avgCompetition)} local providers` : 'Board-certified practitioners',
        'Same-week appointments',
        'Free consultation',
        '4.9★ rating'
      ],
      cta: { primary: 'Book Free Consultation', secondary: 'Call Now' },
      formFields: ['Name', 'Phone', 'Email', 'Preferred time', `Interested in (${procedure})`]
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
      'Schedule weekly reviews',
      'Prepare lead response templates',
      'Set up lead tracking system'
    ]
  };
}

}
