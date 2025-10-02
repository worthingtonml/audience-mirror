"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* =========================
   Types
========================= */
type PlatformID = "facebook" | "instagram" | "tiktok" | "google";

interface Props {
  initialZip?: string | null;
}

type CampaignData = {
  procedure: string;
  platform: PlatformID;
  overview: string;
  kpis: string[];
  insights: string[];
  nextSteps: string[];
  metrics: {
    match: number;
    cplRange: [number, number];
    engagementRange: [number, number];
    bookingRateRange: [number, number];
  };
  variants: Array<{ headline: string; body: string }>;
  creativeGuidance: { 
    images: string[]; 
    videos: string[]; 
    notes?: string 
  };
};

const PLATFORM_META: Record<PlatformID, { name: string; color: string; icon: string }> = {
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

export default function PrescriptiveCampaignFlow({ initialZip }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedProcedure, setSelectedProcedure] = useState<string>("all");
  const [selectedZip, setSelectedZip] = useState<string | null>(initialZip || null);
  const [selectedCohort, setSelectedCohort] = useState<string>("Budget Conscious");
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformID | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
  const zipFromUrl = searchParams?.get('zip');
  const cohortFromUrl = searchParams?.get('cohort');
  const procedureFromUrl = searchParams?.get('procedure');
  
  if (zipFromUrl) {
    setSelectedZip(zipFromUrl);
    if (cohortFromUrl) setSelectedCohort(cohortFromUrl);
    if (procedureFromUrl) setSelectedProcedure(procedureFromUrl);
    generateCampaign(zipFromUrl, procedureFromUrl || selectedProcedure);
  } else {
    // No ZIP in URL - set a default for testing
    setSelectedZip('11030');
    generateCampaign('11030', selectedProcedure);
  }
}, [searchParams]);

  const generateCampaign = async (zip: string, procedure: string = selectedProcedure) => {
  setLoading(true);
  try {
    const res = await fetch('/api/campaign-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip, procedure, cohort: selectedCohort })
    });
    const data = await res.json();
    
    // Transform API response to match component expectations
    const topPlatform = data.platforms?.[0]; // Get highest scoring platform
    
    const transformedData: CampaignData = {
      procedure: procedure,
      platform: (topPlatform?.name || 'facebook') as PlatformID,
      overview: `Recommended platform: ${topPlatform?.name || 'Facebook'} with ${topPlatform?.score || 0}% confidence score`,
      kpis: [
        `CPL: ${topPlatform?.metrics?.cpl || '$15-20'}`,
        `Booking Rate: ${topPlatform?.metrics?.bookingRate || '15%'}`,
        `ROAS: ${topPlatform?.metrics?.roas || '3.0x'}`
      ],
      insights: data.insights?.map((i: any) => i.text) || [],
      nextSteps: [
        'Launch campaign on recommended platform',
        'Test ad copy variations',
        'Monitor performance metrics'
      ],
      metrics: {
        match: (topPlatform?.score || 75) / 100,
        cplRange: [15, 25],
        engagementRange: [2, 5],
        bookingRateRange: [10, 20]
      },
      variants: topPlatform?.adCopy?.map((copy: string) => ({
        headline: copy,
        body: 'Transform your look with our expert treatments. Book your consultation today.'
      })) || [],
      creativeGuidance: {
        images: ['Professional treatment photos', 'Before/after results'],
        videos: ['Patient testimonials', 'Treatment process'],
        notes: data.creativeGuidance?.notes
      }
    };
    
    setCampaignData(transformedData);
    setActivePlatform((topPlatform?.name || 'facebook') as PlatformID);
  } catch (error) {
    console.error('Failed to generate campaign:', error);
  } finally {
    setLoading(false);
  }
};

  const copyToClipboard = (text: string, itemName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  if (!campaignData || !selectedZip) {
    return <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="text-lg">Loading campaign data...</div>
    </div>;
  }

  const currentPlatform = activePlatform || campaignData.platform;
  const meta = PLATFORM_META[currentPlatform];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div style={{ backgroundColor: meta.color }} className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7" style={{ color: meta.color }} fill="currentColor" viewBox="0 0 24 24">
                    <path d={meta.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white uppercase tracking-wide mb-1">
                    {meta.name} CAMPAIGN
                  </div>
                  <h2 className="text-lg text-white/90">
                    ZIP {selectedZip} • {selectedCohort}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {Object.keys(PLATFORM_META).map((platformId) => (
                    <button
                      key={platformId}
                      onClick={() => {
                        setActivePlatform(platformId as PlatformID);
                        generateCampaign(selectedZip, selectedProcedure);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        platformId === currentPlatform 
                          ? "bg-white text-gray-900 shadow-md" 
                          : "text-white/70 hover:text-white hover:bg-white/20"
                      }`}
                    >
                      {PLATFORM_META[platformId as PlatformID].name}
                    </button>
                  ))}
                </div>
                <div className="px-3 py-1 bg-white/20 text-sm font-medium text-white rounded">
                  {(campaignData.metrics.match * 100).toFixed(0)}% Match
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8 text-[1.125rem] leading-8">
            {/* Strategy Overview */}
            <section
              className="p-6 rounded-xl border"
              style={{
                background: `linear-gradient(to bottom right, ${meta.color}10, white)`,
                borderColor: `${meta.color}30`,
              }}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                STRATEGY OVERVIEW
              </h3>
              <p className="text-gray-800">{campaignData.overview}</p>

              <div className="grid md:grid-cols-3 gap-4 mt-5">
                {campaignData.kpis.map((kpi, idx) => {
                  const [label, value] = kpi.split(":");
                  return (
                    <div key={idx} className="text-gray-800">
                      <span className="font-semibold text-gray-900">{label}:</span>
                      <span>{value}</span>
                    </div>
                  );
                })}
              </div>

              {campaignData.insights && campaignData.insights.length > 0 && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: `${meta.color}20` }}>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    KEY INSIGHTS
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {campaignData.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            idx === 0 ? "bg-blue-500" : 
                            idx === 1 ? "bg-green-500" : 
                            idx === 2 ? "bg-purple-500" : "bg-orange-500"
                          }`}
                        />
                        <p className="text-gray-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Recommended Actions */}
            <section
              className="p-6 rounded-xl border"
              style={{
                background: `linear-gradient(to bottom right, ${meta.color}08, white)`,
                borderColor: `${meta.color}20`,
              }}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                RECOMMENDED ACTIONS
              </h3>
              <ul className="space-y-3">
                {campaignData.nextSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-800">
                    <span className="text-gray-900 font-bold mt-1">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Ad Copy Variations */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                AD COPY VARIATIONS
              </h3>
              <ul className="w-full space-y-5">
                {campaignData.variants.map((ad, idx) => (
                  <li key={idx} className="relative rounded-xl border border-gray-200 p-6">
                    <button
                      onClick={() => copyToClipboard(`${ad.headline}\n\n${ad.body}`, `ad-${idx}`)}
                      className="absolute right-4 top-4 rounded-md px-3 py-1 text-xs font-semibold text-white shadow-sm hover:brightness-95"
                      style={{ backgroundColor: meta.color }}
                    >
                      {copiedItem === `ad-${idx}` ? "Copied" : "Copy"}
                    </button>
                    <div className="max-w-[90ch] pr-24">
                      <h4 className="text-2xl font-semibold text-gray-900 mb-2">{ad.headline}</h4>
                      <p className="text-[1.125rem] text-gray-800 leading-8">{ad.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Creative */}
            <section className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">IMAGES</div>
                  <div className="space-y-2 text-gray-800">
                    {campaignData.creativeGuidance.images.map((img, idx) => (
                      <div key={idx}>• {img}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">VIDEOS</div>
                  <div className="space-y-2 text-gray-800">
                    {campaignData.creativeGuidance.videos.map((video, idx) => (
                      <div key={idx}>• {video}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    PHOTOGRAPHY BRIEF
                  </div>
                  <p className="text-gray-800">
                    Bright, authentic imagery showcasing real results and approachable staff.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    VIDEO CONCEPT
                  </div>
                  <p className="text-gray-800">
                    {campaignData.creativeGuidance.notes || "Educational content emphasizing transparency and client success stories."}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}