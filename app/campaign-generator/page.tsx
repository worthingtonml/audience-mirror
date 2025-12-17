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
  const [instagramAdCopy, setInstagramAdCopy] = useState<any>(null);
  const [googleAdCopy, setGoogleAdCopy] = useState<any>(null);
  const [llmCopy, setLlmCopy] = useState<any>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [showOptimizationTips, setShowOptimizationTips] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showKPIs, setShowKPIs] = useState(false);
  const [emailSequence, setEmailSequence] = useState<any>(null);
  const [smsMessages, setSmsMessages] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [emailSequenceType, setEmailSequenceType] = useState('nurture');
  const [vertical, setVertical] = useState('medspa');
  const [smsType, setSmsType] = useState('reactivation');
  const [showEmails, setShowEmails] = useState(true);
  const [showSms, setShowSms] = useState(true);
  
  useEffect(() => {
    const zipCodes = searchParams.get('zip')?.split(',') || [];
    const procedure = searchParams.get('procedure') || 'all';
    const verticalParam = searchParams.get('vertical') || 'medspa';
    setVertical(verticalParam);
    const procedureDisplay = procedure === 'all' ? 'aesthetic treatments' : procedure;
    const runId = sessionStorage.getItem('runId');
    
    if (!runId) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/runs/${runId}/results`)
      .then(res => res.json())
      .then(data => {
        console.log('API data:', data);
        if (data.status === 'done') {
          const primaryCity = data.geographic_summary?.primary_city || 'your area';

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
            vertical: verticalParam,
            demographics: data.demographics,
            behaviorPatterns: data.behavior_patterns,
            profileCharacteristics: data.profile_characteristics,
            dominantProfile: data.dominant_profile,
            actualTreatments: data.actual_treatments,
            revenueStats: data.actual_revenue_stats,
            totalPatients: data.patient_count,
            city: primaryCity
          });

          setCampaignData(campaign);

          // Generate LLM-powered ad copy
          const copyFormData = new FormData();
          copyFormData.append('vertical', verticalParam);
          copyFormData.append('profile_type', data.dominant_profile?.combined || 'clients');
          copyFormData.append('city', primaryCity);
          copyFormData.append('avg_ltv', (data.behavior_patterns?.avg_lifetime_value || 5000).toString());
          copyFormData.append('total_clients', (data.patient_count || 50).toString());
          copyFormData.append('top_services', Object.keys(data.actual_treatments || {}).slice(0, 3).join(', '));
          
          fetch(`${API_URL}/api/v1/campaigns/generate-copy`, {
            method: 'POST',
            body: copyFormData
          })
            .then(res => res.json())
            .then(copy => {
              console.log('[LLM Copy]', copy);
              setLlmCopy(copy);
            })
            .catch(err => console.error('[LLM Copy Error]', err));

          // Generate AI-powered Instagram ads
          generateInstagramAds(selectedSegments, primaryCity).then(igAd => {
            setInstagramAdCopy(igAd);
            console.log('[Instagram AI]', igAd);
          });
          
          // Generate AI-powered Google Search ads
          generateGoogleAds(selectedSegments, primaryCity).then(googleAd => {
            setGoogleAdCopy(googleAd);
            console.log('[Google AI]', googleAd);
          });
          
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

  const generateInstagramAds = async (segments: any[], city: string) => {
    // Generate Instagram ads for each segment
    const instagramAds = await Promise.all(
      segments.map(async (segment) => {
        try {
          const formData = new FormData();
          formData.append('segment_name', segment.cohort || 'Unknown Segment');
          formData.append('patient_count', segment.patient_count?.toString() || '0');
          formData.append('avg_ltv', segment.avg_ltv?.toString() || '0');
          formData.append('avg_ticket', segment.avg_ticket?.toString() || '0');
          formData.append('top_procedures', segment.top_procedures?.join(',') || 'General Treatments');
          formData.append('target_demographics', `Ages ${segment.avg_age || 35}, Income $${segment.avg_income || 75}k+`);
          formData.append('practice_name', 'Your Practice');
          formData.append('practice_city', city || 'your area');

          const response = await fetch('http://localhost:8000/api/v1/campaigns/instagram', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Instagram API failed');
          }

          return await response.json();
        } catch (error) {
          console.error('[Instagram API Error]', error);
          // Return fallback
          return {
            caption: '✨ Transform your look with expert treatments',
            first_comment: 'Book your free consultation today',
            hashtags: ['aesthetics', 'beauty', 'transformation'],
            story_cta: 'Swipe up to book'
          };
        }
      })
    );

    return instagramAds[0]; // Return first segment's Instagram ad for now
  };
  
  const generateGoogleAds = async (segments: any[], city: string) => {
    const segment = segments[0];
    if (!segment) return null;
    
    try {
      const formData = new FormData();
      formData.append('segment_name', segment.cohort || 'Primary Segment');
      formData.append('patient_count', segment.patient_count?.toString() || '0');
      formData.append('avg_ltv', segment.avg_ltv?.toString() || '0');
      formData.append('avg_ticket', segment.avg_ticket?.toString() || '0');
      formData.append('top_procedures', segment.top_procedures?.join(',') || 'General Treatments');
      formData.append('target_demographics', `Ages ${segment.avg_age || 35}, Income $${segment.avg_income || 75}k+`);
      formData.append('practice_name', 'Your Practice');
      formData.append('practice_city', city || 'your area');

      const response = await fetch('http://localhost:8000/api/v1/campaigns/google', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Google Ads API failed');
      }

      return await response.json();
    } catch (error) {
      console.error('[Google Ads API Error]', error);
      // Return fallback
      const primaryProcedure = segment.top_procedures?.[0] || 'aesthetic treatments';
      return {
        headlines: [
          `${primaryProcedure} in ${city || 'your area'}`,
          `Top-rated ${primaryProcedure}`,
          'Book a free consult'
        ],
        descriptions: [
          `Expert ${primaryProcedure}. Trusted locally. Book today.`,
          `Same-week appointments in ${city || 'your area'}.`
        ],
        keywords: [
          primaryProcedure,
          `${primaryProcedure} near me`,
          `${primaryProcedure} ${city || 'your area'}`
        ]
      };
    }
  };

  const generateEmailSequence = async (sequenceType: string) => {
    setEmailLoading(true);
    try {
      const segment = campaignData?.overview?.profileType || 'Comfort Spenders';
      const procedure = campaignData?.overview?.procedure || 'aesthetic treatments';
      
      const formData = new FormData();
      formData.append('segment_name', segment);
      formData.append('procedure', procedure);
      formData.append('sequence_type', sequenceType);
      formData.append('practice_name', 'Your Practice');
      formData.append('practice_city', campaignData?.overview?.city || 'Your City');
      formData.append('vertical', vertical);

      const response = await fetch(`${API_URL}/api/v1/campaigns/email`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Email API failed');
      const data = await response.json();
      setEmailSequence(data);
    } catch (error) {
      console.error('[Email API Error]', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const generateSmsMessages = async (campaignType: string) => {
    setSmsLoading(true);
    try {
      const segment = campaignData?.overview?.profileType || 'Comfort Spenders';
      const procedure = campaignData?.overview?.procedure || 'aesthetic treatments';
      
      const formData = new FormData();
      formData.append('segment_name', segment);
      formData.append('procedure', procedure);
      formData.append('campaign_type', campaignType);
      formData.append('practice_name', 'Your Practice');
      formData.append('practice_phone', '(555) 123-4567');
      formData.append('vertical', vertical);

      const response = await fetch(`${API_URL}/api/v1/campaigns/sms`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('SMS API failed');
      const data = await response.json();
      setSmsMessages(data);
    } catch (error) {
      console.error('[SMS API Error]', error);
    } finally {
      setSmsLoading(false);
    }
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
                { key: 'patientCount', label: 'Patient Count', format: (v: any) => v.toString() },
                { key: 'age', label: 'Avg Patient Age', format: (v: number) => Math.round(v).toString() },
                { key: 'ltv', label: 'Lifetime Value', format: (v: number) => `$${(v/1000).toFixed(1)}K` },
                { key: 'frequency', label: 'Annual Visits', format: (v: number) => `${v.toFixed(1)}×` },
                { key: 'income', label: 'Avg Income', format: (v: number) => `$${(v/1000).toFixed(0)}K` },
                { key: 'profile', label: 'Patient Profile', format: (v: any) => String(v).split(' - ')[0] }
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
        <div className="flex gap-6 mb-6 border-b border-slate-200">
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
          
          
        </div>

        {activeTab === 'ads' && (
  <>
   {/* The Opportunity - Outcome first */}
<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
  <div className="flex items-start justify-between">
    <div>
      <div className="text-sm text-slate-500 mb-1">Projected Monthly Revenue</div>
      <div className="text-4xl font-bold text-slate-900">$41K</div>
      <div className="text-sm text-slate-600 mt-2">from 10 new patients</div>
    </div>
    <div className="text-right">
      <div className="text-sm text-slate-500 mb-1">Ad Spend</div>
      <div className="text-2xl font-bold text-slate-700">$4.4K</div>
      <div className="inline-block mt-2 px-2 py-1 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded">
        9.3× return
      </div>
    </div>
  </div>
  
  <p className="mt-5 pt-4 border-t border-slate-100 text-sm text-slate-600">
    {campaignData.strategy.summary}
  </p>
  
  <button
    onClick={() => setShowKPIs(!showKPIs)}
    className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
  >
    {showKPIs ? 'Hide details' : 'View detailed KPIs'}
  </button>
  
{showKPIs && (
  <div className="mt-4 space-y-4">
    {/* From Your Data */}
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase mb-2">From Your Data</div>
      <div className="grid grid-cols-4 gap-3">
        {campaignData.kpis.fromYourData.map((kpi: any, i: number) => (
          <div key={i} className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="text-xs text-emerald-700">{kpi.metric}</div>
            <div className="text-sm font-semibold text-emerald-900 mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Projections */}
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Projections</div>
      <div className="grid grid-cols-4 gap-3">
        {campaignData.kpis.projections.map((kpi: any, i: number) => (
          <div key={i} className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xs text-slate-500">{kpi.metric}</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>
    </div>
    
    {/* Industry Benchmarks */}
    <div>
      <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Industry Benchmarks</div>
      <div className="grid grid-cols-3 gap-3">
        {campaignData.kpis.industryBenchmarks.map((kpi: any, i: number) => (
          <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="text-xs text-amber-700">{kpi.metric}</div>
            <div className="text-sm font-semibold text-amber-900 mt-1">{kpi.value}</div>
            <div className="text-xs text-amber-600 mt-1">{kpi.note}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}


</div>

    {/* Controls */}
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => {
          const allCampaigns = campaignData.platforms.map((platform: any) => {
            const platformData = [
              `\n=== ${platform.name.toUpperCase()} ===`,
              `Budget: $${(platform.budget / 1000).toFixed(1)}K/month (${platform.allocationPct}%)`,
              `Strategy: ${platform.strategyDescription}`,
              `\nADS:\n`
            ];
            platform.ads.forEach((ad: any, idx: number) => {
              platformData.push(
                `\n--- Ad ${idx + 1}: ${ad.geography || ad.location} ---`,
                `Audience: ${ad.demographics}`,
                `Headline: ${ad.headline}`,
                `Copy: ${ad.copy}`,
                `Daily Budget: $${ad.dailyBudget}`,
                ''
              );
            });
            return platformData.join('\n');
          }).join('\n\n');

          const fullExport = [
            `CAMPAIGN EXPORT - ${campaignData.overview.procedure}`,
            `Generated: ${new Date().toLocaleDateString()}`,
            `\nBudget: $${(campaignData.overview.monthlyBudget / 1000).toFixed(1)}K → ${campaignData.overview.expectedPatients} bookings → $${(campaignData.overview.expectedRevenue / 1000).toFixed(1)}K revenue (${campaignData.overview.roas}× ROAS)`,
            allCampaigns
          ].join('\n');

          navigator.clipboard.writeText(fullExport);
          setCopiedIndex('export-all');
          setTimeout(() => setCopiedIndex(null), 2000);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        {copiedIndex === 'export-all' ? (
          <><Check className="h-4 w-4" />Copied!</>
        ) : (
          <><Copy className="h-4 w-4" />Export all campaigns</>
        )}
      </button>

      <button
        onClick={() => setShowOptimizationTips(!showOptimizationTips)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Lightbulb className="h-4 w-4" />
        {showOptimizationTips ? 'Hide tips' : 'Show tips'}
      </button>
    </div>

    {/* Platform Cards - Collapsed by default */}
    {campaignData.platforms.map((platform: any) => {
      const isExpanded = expandedPlatforms[platform.name] || false;
      
      return (
        <div key={platform.name} className="bg-white rounded-xl border border-slate-200 mb-4 shadow-sm overflow-hidden">
          {/* Collapsed Header - Always visible */}
          <button
            onClick={() => setExpandedPlatforms(prev => ({ ...prev, [platform.name]: !isExpanded }))}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {platform.icon}
              <div className="text-left">
                <div className="font-semibold text-slate-900">{platform.name}</div>
                <div className="text-sm text-slate-600">{platform.strategyTitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xl font-bold text-slate-900">{platform.allocationPct}%</div>
                <div className="text-xs text-slate-500">${(platform.budget / 1000).toFixed(1)}K/mo</div>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="px-4 pb-4 border-t border-slate-100">
              {/* Strategy Description */}
              <div className={`rounded-lg p-4 my-4 ${
                platform.name === 'Facebook Ads' ? 'bg-blue-50 border border-blue-100' :
                platform.name === 'Instagram Ads' ? 'bg-purple-50 border border-purple-100' :
                'bg-indigo-50 border border-indigo-100'
              }`}>
                <p className={`text-sm ${
                  platform.name === 'Facebook Ads' ? 'text-blue-800' :
                  platform.name === 'Instagram Ads' ? 'text-purple-800' :
                  'text-indigo-800'
                }`}>
                  {platform.strategyDescription}
                </p>
              </div>

              {/* Ad Details */}
              {platform.ads.map((ad: any, index: number) => {
                const isFacebook = platform.name === 'Facebook Ads';
                const isInstagram = platform.name === 'Instagram Ads';
                const isGoogle = platform.name === 'Google Search';
                
                // Use LLM-generated copy when available
                const displayHeadline = isFacebook && llmCopy?.facebook?.headline 
                  ? llmCopy.facebook.headline 
                  : isInstagram && llmCopy?.instagram?.headline 
                  ? llmCopy.instagram.headline 
                  : ad.headline;
                const displayCopy = isFacebook && llmCopy?.facebook?.body 
                  ? llmCopy.facebook.body 
                  : isInstagram && llmCopy?.instagram?.body 
                  ? llmCopy.instagram.body 
                  : ad.copy;
                const googleHeadlines = isGoogle && llmCopy?.google?.headlines 
                  ? llmCopy.google.headlines 
                  : isGoogle && googleAdCopy?.headlines 
                  ? googleAdCopy.headlines 
                  : null;
                const googleDescriptions = isGoogle && llmCopy?.google?.descriptions 
                  ? llmCopy.google.descriptions 
                  : isGoogle && googleAdCopy?.descriptions 
                  ? googleAdCopy.descriptions 
                  : null;

                return (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-sm text-slate-600">{ad.demographics}</div>
                      <div className="text-sm font-semibold text-slate-900">${ad.dailyBudget}/day</div>
                    </div>

                    {/* Optimization Tip */}
                    {showOptimizationTips && ad.optimizationTip && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-900">{ad.optimizationTip}</div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-slate-500 uppercase mb-1">{googleHeadlines ? 'Headlines' : 'Headline'}</div>
                        {googleHeadlines ? (
                          <div className="space-y-1">
                            {googleHeadlines.map((headline: string, i: number) => (
                              <div key={i} className="text-sm font-medium text-slate-900">• {headline}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-slate-900">{ad.headline}</div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 uppercase mb-1">Ad Copy</div>
                        {googleDescriptions ? (
                          <div className="space-y-1 bg-slate-50 p-3 rounded">
                            {googleDescriptions.map((desc: string, i: number) => (
                              <div key={i} className="text-sm text-slate-900">• {desc}</div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-900 bg-slate-50 p-3 rounded">
                            {isInstagram && instagramAdCopy?.caption ? instagramAdCopy.caption : ad.copy}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(
                        `Platform: ${platform.name}\nAudience: ${ad.demographics}\nHeadline: ${googleHeadlines ? googleHeadlines.join(' | ') : ad.headline}\nCopy: ${googleDescriptions ? googleDescriptions.join(' ') : (isInstagram && instagramAdCopy?.caption ? instagramAdCopy.caption : ad.copy)}\nBudget: $${ad.dailyBudget}/day`,
                        `${platform.name}-${index}`
                      )}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors mt-4"
                    >
                      {copiedIndex === `${platform.name}-${index}` ? (
                        <><Check className="h-4 w-4" />Copied!</>
                      ) : (
                        <><Copy className="h-4 w-4" />Copy ad</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    })}
  </>
)}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* AI Email Sequence Generator */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowEmails(!showEmails)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${showEmails ? 'rotate-180' : ''}`} />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Email Nurture Sequence</h2>
                      <p className="text-sm text-slate-600">3-email series tailored to {campaignData?.overview?.profileType || 'your patients'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={emailSequenceType}
                      onChange={(e) => setEmailSequenceType(e.target.value)}
                      className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                    >
                      <option value="nurture">New Lead Nurture</option>
                      <option value="reactivation">Win-Back / Reactivation</option>
                      <option value="upsell">Upsell Existing Patients</option>
                      <option value="post_visit">Post-Treatment Follow-up</option>
                    </select>
                    <button
                      onClick={() => generateEmailSequence(emailSequenceType)}
                      disabled={emailLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {emailLoading ? (
                        <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Generating...</>
                      ) : (
                        'Generate Sequence'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {showEmails && (
                <div className="p-6">
                  {emailSequence ? (
                    <div className="space-y-4">
                      {emailSequence.sequence_strategy && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-indigo-900">Strategy</div>
                          <div className="text-sm text-indigo-700 mt-1">{emailSequence.sequence_strategy}</div>
                        </div>
                      )}
                      {emailSequence.sequence?.map((email: any, i: number) => (
                        <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4 bg-slate-50">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Email {email.email_number}: {email.subject_line}</div>
                              <div className="text-xs text-slate-500 mt-0.5">Send: {email.send_delay}</div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(
                                `Subject: ${email.subject_line}\nPreview: ${email.preview_text}\n\n${email.body}\n\n[${email.cta_text}]`,
                                `email-${i}`
                              )}
                              className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              {copiedIndex === `email-${i}` ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
                            </button>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="text-xs text-slate-500 uppercase mb-1">Subject</div>
                              <div className="text-sm font-medium text-slate-900">{email.subject_line}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 uppercase mb-1">Preview</div>
                              <div className="text-sm text-slate-600">{email.preview_text}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 uppercase mb-1">Body</div>
                              <div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded p-3">{email.body}</div>
                            </div>
                            <div className="pt-2">
                              <span className="inline-block bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded">{email.cta_text}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-sm">Select a sequence type and click "Generate Sequence"</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI SMS Generator */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowSms(!showSms)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${showSms ? 'rotate-180' : ''}`} />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">SMS Outreach</h2>
                      <p className="text-sm text-slate-600">Short, high-conversion text messages</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={smsType}
                      onChange={(e) => setSmsType(e.target.value)}
                      className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                    >
                      <option value="reactivation">Win-Back / Reactivation</option>
                      <option value="appointment_reminder">Appointment Reminder</option>
                      <option value="flash_offer">Flash Offer / Promo</option>
                      <option value="post_visit">Post-Treatment Check-in</option>
                      <option value="waitlist">Waitlist Notification</option>
                    </select>
                    <button
                      onClick={() => generateSmsMessages(smsType)}
                      disabled={smsLoading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {smsLoading ? (
                        <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Generating...</>
                      ) : (
                        'Generate SMS'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {showSms && (
                <div className="p-6">
                  {smsMessages ? (
                    <div className="space-y-4">
                      {smsMessages.recommended_send_time && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-green-900">Best Send Time</div>
                          <div className="text-sm text-green-700 mt-1">{smsMessages.recommended_send_time}</div>
                        </div>
                      )}
                      <div className="grid gap-4">
                        {smsMessages.messages?.map((msg: any, i: number) => (
                          <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-3 bg-slate-50">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-900">Variant {msg.variant}</span>
                                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{msg.character_count} chars</span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(msg.text, `sms-${i}`)}
                                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                {copiedIndex === `sms-${i}` ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}
                              </button>
                            </div>
                            <div className="p-4">
                              <div className="text-sm text-slate-800 font-mono bg-slate-50 rounded p-3">{msg.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {smsMessages.compliance_note && (
                        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <strong>Compliance:</strong> {smsMessages.compliance_note}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-sm">Select a campaign type and click "Generate SMS"</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/patient-insights')}
              className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ← Back to Patient Insights
            </button>
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
    vertical,
    demographics,
    behaviorPatterns,
    profileCharacteristics,
    dominantProfile,
    actualTreatments,
    revenueStats,
    totalPatients,
    city  
  } = params;
  const isRealEstate = vertical === 'real_estate_mortgage';
  const procedureDisplay = procedure === 'all' 
    ? (isRealEstate ? 'real estate services' : 'aesthetic treatments')
    : procedure;
  const customerTerm = isRealEstate ? 'clients' : 'patients';
  const transactionTerm = isRealEstate ? 'transactions' : 'treatments';
  console.log('[DEBUG] procedure:', procedure, 'procedureDisplay:', procedureDisplay);
  
  // ✅ Validate segments
  if (!segments || segments.length === 0) {
    console.error('[CAMPAIGN] No segments provided');
    return null;
  }

  const validSegments = segments.filter((s: any) => s && typeof s === 'object');
  console.log(`[CAMPAIGN] Processing ${validSegments.length} valid segments`);

  // Track data quality
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
  
  // ✅ Aggregate data across ALL segments for this profile
  const allZips = validSegments.map((s: any) => s.zip).join(', ');
  const totalBookings = validSegments.reduce((sum: number, s: any) => sum + (Number(s.expected_bookings) || 0), 0);
  const totalRevenue = validSegments.reduce((sum: number, s: any) => sum + (Number(s.expected_monthly_revenue) || 0), 0);
  
  const avgCompetition = validSegments.length > 0
    ? validSegments.reduce((sum: number, s: any) => sum + (Number(s.competitors) || 0), 0) / validSegments.length
    : 2;

  const cpaValues = validSegments
    .map((s: any) => Number(s.cpa_target) || 0)
    .filter((v: number) => v > 0);
  
  const avgCPA = cpaValues.length > 0
    ? cpaValues.reduce((sum: number, val: number) => sum + val, 0) / cpaValues.length
    : 150;

  const monthlyBudget = totalBookings > 0 && avgCPA > 0
    ? Math.round(avgCPA * totalBookings)
    : 5000;

  console.log(`[CAMPAIGN] Budget: ${totalBookings} bookings × $${avgCPA.toFixed(0)} CPA = $${monthlyBudget}`);

  if (isNaN(monthlyBudget) || monthlyBudget <= 0) {
    console.error('[CAMPAIGN] Invalid budget calculated');
    return null;
  }

  // Platform allocation based on profile
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

  // ✅ ONE AD PER PLATFORM (profile-based, not ZIP-based)
  const platforms = [
    {
      name: 'Facebook Ads',
      icon: <Facebook className="h-6 w-6 text-blue-600" />,
      reasoning: `${Math.round(fbPct * 100)}% - ${avgAge ? (avgAge > 40 ? `Ages ${Math.round(avgAge)}+ demographic` : 'Local reach & awareness') : 'Local awareness'}`,
      strategyTitle: avgFrequency > 3 ? 'Facebook: Loyalty & Repeat Visits' : `Facebook: New ${isRealEstate ? 'Client' : 'Patient'} Acquisition`,
      strategyDescription: avgFrequency > 3
        ? `Your ${profileType} ${customerTerm} visit ${avgFrequency.toFixed(1)}× yearly. Facebook's lookalike audiences will find similar high-frequency ${customerTerm}. Use retargeting to stay top-of-mind for repeat bookings.`
        : avgLTV > 5000
        ? `High-value ${profileType} ${customerTerm} ($${(avgLTV/1000).toFixed(1)}K LTV) need trust before booking. Facebook builds awareness through testimonials and educational content that leads to Google Search conversions.`
        : `Target ${profileType} segment through Facebook's detailed demographic and interest targeting. Build local awareness that converts to consultations.`,
      budget: Math.round(monthlyBudget * fbPct),
      allocationPct: Math.round(fbPct * 100),
      ads: [{
        profileTarget: profileType,
        geography: `${validSegments.length} neighborhoods: ${allZips}`,
        demographics: `Ages ${avgAge ? Math.round(avgAge - 10) : 25}-${avgAge ? Math.round(avgAge + 15) : 50}, Income $${avgIncome >= 100000 ? '100k+' : '75k+'}`,
        behavioralTraits: `Visits ${avgFrequency.toFixed(1)}× yearly, $${(avgLTV/1000).toFixed(1)}K lifetime value`,
        headline: avgCompetition === 0
          ? `Expert ${procedureDisplay} in ${city || 'your area'}`
          : avgLTV > 5000
          ? `Premium ${procedureDisplay} for Discerning Clients`
          : `Trusted ${procedureDisplay} Specialist`,
        copy: avgCompetition === 0
          ? `Be among the first to experience ${procedureDisplay} from ${city || 'your area'}'s newest expert practice. Limited introductory pricing for early ${customerTerm}. Book your complimentary consultation today.`
          : avgLTV > 5000
          ? `${profileType} choose us for personalized service and proven results. Join ${totalPatients}+ satisfied ${customerTerm} who trust our expertise. Book your private consultation.`
          : `Trusted by ${totalPatients}+ ${customerTerm} across ${city || 'your area'}. ${profileType} love our results. Book your free consultation and see why your neighbors choose us.`,
        dailyBudget: Math.round((monthlyBudget * fbPct) / 30),
        optimizationTip: avgFrequency > 3
          ? `Your patients visit ${avgFrequency.toFixed(1)}× yearly. Highlight package deals and VIP memberships to maximize lifetime value.`
          : avgLTV > 5000
          ? `High-value patients ($${(avgLTV/1000).toFixed(1)}K LTV) respond to premium positioning. Avoid discount language—emphasize expertise and personalized care.`
          : `${profileType} patients are active across ${validSegments.length} neighborhoods. Use location-based creative to increase relevance.`
      }]
    },
    {
      name: 'Instagram Ads',
      icon: <Instagram className="h-6 w-6 text-pink-600" />,
      reasoning: `${Math.round(igPct * 100)}% - ${avgAge && avgAge < 35 ? `Ages ${Math.round(avgAge)} (IG core demographic)` : 'Visual proof & awareness'}`,
      strategyTitle: avgAge && avgAge < 35 ? 'Instagram: Your Core Demographic' : 'Instagram: Visual Proof & Brand Building',
      strategyDescription: avgAge && avgAge < 35
        ? `Age ${Math.round(avgAge)} is Instagram's sweet spot. ${profileType} are highly active on Stories and Reels. Use before/after carousels to showcase results—they outperform single images by 60%.`
        : topTreatments.length >= 2
        ? `Your ${profileType} patients often combine ${topTreatments[0]} + ${topTreatments[1]}. Instagram showcases multi-treatment transformations. Carousel ads work best: problem → treatment A → treatment B → final result.`
        : `Instagram builds awareness and desire for ${profileType}. ${customerTerm.charAt(0).toUpperCase() + customerTerm.slice(1)} may not book immediately but will search your name on Google later. Focus on brand equity and visual proof.`,
      budget: Math.round(monthlyBudget * igPct),
      allocationPct: Math.round(igPct * 100),
      ads: [{
        profileTarget: profileType,
        geography: `${validSegments.length} neighborhoods: ${allZips}`,
        demographics: `Ages ${avgAge ? Math.round(avgAge - 15) : 20}-${avgAge ? Math.round(avgAge + 5) : 40}, Beauty enthusiasts`,
        behavioralTraits: `Visits ${avgFrequency.toFixed(1)}× yearly, $${(avgLTV/1000).toFixed(1)}K lifetime value`,
        
        headline: `✨ Real ${procedureDisplay} Results`,
        copy: `See actual transformations from ${city || 'your area'} ${profileType}...`, 
        
        dailyBudget: Math.round((monthlyBudget * igPct) / 30),
        optimizationTip: avgAge && avgAge < 35
          ? `Age ${Math.round(avgAge)} expects instant booking. Show "Book appointment" CTA in first frame. Use Stories ads for 40% lower cost per lead.`
          : topTreatments.length >= 2
          ? `Cross-service behavior detected: ${profileType} often combine treatments. Create carousel ads showing combined results for higher engagement.`
          : `${profileType} need visual proof. Use real patient photos (not stock images) to increase trust and conversions by 35%.`
      }]
    },
    {
      name: 'Google Search',
      icon: <Search className="h-6 w-6 text-slate-700" />,
      reasoning: `${Math.round(googlePct * 100)}% - ${avgCompetition > 3 ? 'High competition requires search dominance' : 'High-intent capture'}`,
      strategyTitle: avgCompetition > 3 ? 'Google: Bottom-Funnel Capture' : 'Google: Low-Cost Conversions',
      strategyDescription: avgCompetition > 3
        ? `With ${Math.round(avgCompetition)} competitors per ZIP, Google Search is critical. ${profileType} research heavily before booking. These leads convert 2-3× faster than social traffic. Dominate the consideration phase.`
        : avgFrequency > 3
        ? `Low competition + high visit frequency (${avgFrequency.toFixed(1)}×/year) = focus on maintenance keywords. ${profileType} search for "touch-up" and "maintenance" terms. Capture repeat business through search.`
        : `Low competition means CPC under $5. Capture 100% of local search demand before competitors enter. ${profileType} actively searching convert fastest—emphasize immediate availability.`,
      budget: Math.round(monthlyBudget * googlePct),
      allocationPct: Math.round(googlePct * 100),
      ads: [{
        profileTarget: profileType,
        geography: `${validSegments.length} neighborhoods: ${allZips}`,
        demographics: `High-intent searchers across ${city || 'your area'}`,
        behavioralTraits: `Visits ${avgFrequency.toFixed(1)}× yearly, $${(avgLTV/1000).toFixed(1)}K lifetime value`,
        headline: `${procedureDisplay} in ${city || 'your area'}`,
        copy: avgCompetition === 0
          ? `Expert ${procedureDisplay} in ${city || 'your area'}. Same-week appointments available. Book your free consultation online.`
          : avgCompetition > 3
          ? `Top-rated ${procedureDisplay} in ${city || 'your area'}. Most experienced team. Proven results. Book your consultation today.`
          : `${city || 'your area'}'s trusted ${procedureDisplay} specialist. ${totalPatients}+ satisfied patients. Same-week appointments. Book now.`,
        dailyBudget: Math.round((monthlyBudget * googlePct) / 30),
        optimizationTip: avgCompetition > 3
          ? `High competition (${Math.round(avgCompetition)} competitors/area) requires aggressive bidding. Focus on unique differentiators in ad copy: certifications, guarantees, or exclusive techniques.`
          : avgFrequency > 3
          ? `${profileType} visit ${avgFrequency.toFixed(1)}×/year. Bid on maintenance keywords: "${procedureDisplay} maintenance", "${procedureDisplay} touch-up", "${procedureDisplay} how often".`
          : `Low competition = CPC under $5. Capture all local search volume. Emphasize availability: "Same-week appointments" increases CTR by 25%.`
      }]
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
      roas,
      city
    },
    strategy: {
      summary: `${profileType}${avgLTV ? `, $${(avgLTV/1000).toFixed(1)}K LTV` : ''}${avgFrequency ? `, ${avgFrequency.toFixed(1)}× yearly` : ''}. ${avgCompetition > 3 ? 'High competition requires search focus.' : 'Low competition allows brand building.'}`,
      primaryMessage: avgCompetition > 3 ? 'Most experienced in market' : 'Locally trusted expert',
      differentiator: avgLTV > 5000 ? 'Premium personalized care' : 'Exceptional results & value'
    },
    platforms,
    // ... rest of the creative/offers/landing/kpis/checklist objects stay the same
    creative: {
      visualStyle: avgIncome > 120000 ? 'Luxury aesthetic - clean, minimal' : 'Aspirational yet approachable',
      visualKeywords: avgIncome > 120000 ? ['Minimal', 'Elegant', 'High-end'] : ['Warm', 'Inviting', 'Professional'],
      imageGuidelines: [
        `Show real ${procedureDisplay} results`,
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

    kpis: {
  fromYourData: [
    { metric: 'Avg Patient LTV', value: `$${(avgLTV/1000).toFixed(1)}K`, isReal: dataQuality.ltv.isReal },
    { metric: 'Visit Frequency', value: `${avgFrequency.toFixed(1)}×/year`, isReal: dataQuality.frequency.isReal },
    { metric: 'Local Competition', value: avgCompetition > 3 ? 'High' : avgCompetition > 1 ? 'Moderate' : 'Low', isReal: true },
    { metric: 'Target Segments', value: `${validSegments.length} ZIPs`, isReal: true },
  ],
  projections: [
    { metric: 'Monthly Ad Spend', value: `$${(monthlyBudget/1000).toFixed(1)}K`, note: 'Based on CPA × bookings' },
    { metric: 'Expected Bookings', value: `${totalBookings}/mo`, note: 'From segment analysis' },
    { metric: 'Projected Revenue', value: `$${(totalRevenue/1000).toFixed(0)}K`, note: 'Bookings × avg ticket' },
    { metric: 'Projected ROAS', value: `${roas}×`, note: 'Revenue ÷ ad spend' },
  ],
  industryBenchmarks: [
    { metric: 'Lead → Consult Rate', value: '30-40%', note: 'Industry average for medspas' },
    { metric: 'Consult → Book Rate', value: '60-70%', note: 'Industry average for medspas' },
    { metric: 'Avg CPC (Google)', value: '$3-8', note: 'Varies by market competition' },
  ]
},
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
