"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   Types
========================= */
type PlatformID = "facebook" | "instagram" | "tiktok" | "google";

interface ZipResult {
  zip: string;
  matchScore: number;
  cohort: string;
  cohortColor: string;
  area: string;
  insight: string;
  topPlatform: { id: PlatformID; reason: string };
}

interface Platform {
  id: PlatformID;
  name: string;
  color: string; // hex
  icon: string;  // SVG path d
  overview: string;
  kpis: string[];
  nextSteps: string[];
  insights: string[];
}

interface AdVariation {
  headline: string;
  body: string;
}

interface Props {
  initialZip?: string | null;
}

/* =========================
   Seed Data (hardcoded demo)
========================= */
const zipResults: ZipResult[] = [
  {
    zip: "11030",
    matchScore: 95,
    cohort: "Budget Conscious",
    cohortColor: "#64748b",
    area: "Manhasset",
    insight:
      "Affluent Long Island suburb where families balance luxury tastes with practical spending. Median age 42, household income $145K. These patients research extensively before booking and respond well to transparent pricing and package deals.",
    topPlatform: { id: "facebook", reason: "Best ROI for budget-conscious audiences" },
  },
  {
    zip: "10805",
    matchScore: 89,
    cohort: "Luxury Clients",
    cohortColor: "#7c3aed",
    area: "New Rochelle",
    insight:
      "Sophisticated Westchester community 8.8 miles from your practice. Median age 38, household income $185K. High social media engagement. These discerning clients prioritize premium results and expect white-glove service.",
    topPlatform: { id: "instagram", reason: "Premium visual storytelling" },
  },
  {
    zip: "11566",
    matchScore: 82,
    cohort: "Comfort Spenders",
    cohortColor: "#059669",
    area: "Merrick",
    insight:
      "Family-oriented Nassau County neighborhood. Median age 45, household income $125K. Residents are cost-conscious but beauty-focused, seeking treatments that fit their budget. High word-of-mouth referral potential.",
    topPlatform: { id: "facebook", reason: "Maximum reach at lowest cost" },
  },
];

const platforms: Platform[] = [
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    icon:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    overview:
      "Leverage Facebook's advanced targeting to find new clients similar to your top customers.",
    kpis: ["Cost per Lead: $12-18", "Engagement Rate: 3-5%", "Booking Rate: 8-12%"],
    nextSteps: [
      "Test carousel vs single image ads",
      "Create lookalike audience from top clients",
      "A/B test ad copy variations",
    ],
    insights: [
      "Max CPA $90 (ROAS 5× on $430); monthly ad cap $540",
      "0.0 competitors/10k (Low competition) — prioritize expansion",
      "Revenue potential $2,579/mo (P50: 6 × $430)",
      "0.0 mi (~0 min) — baseline no-show risk; use standard reminders",
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    icon:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    overview:
      "Instagram's visual platform is perfect for showcasing before/after results and procedure videos.",
    kpis: ["Video Completion: 45-60%", "Story Reply Rate: 2-4%", "Profile Visits: 200-400/week"],
    nextSteps: ["Create Reels showing transformations", "Use Story polls for engagement", "Run Story ads with booking link"],
    insights: [
      "Max CPA $70 (ROAS 5× on $360); monthly ad cap $280",
      "0.0 competitors/10k (Low competition) — prioritize expansion",
      "Revenue potential $1,441/mo (P50: 4 × $360)",
      "8.8 mi (~29 min) — elevated no-show risk; double reminders; consider deposit",
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#000000",
    icon:
      "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z",
    overview: "TikTok's younger audience is actively searching for aesthetic treatments.",
    kpis: ["Video Views: 10k-50k", "Engagement Rate: 5-8%", "Click-Through Rate: 1-2%"],
    nextSteps: ["Post testimonial videos", "Use trending audio", "Partner with local influencers"],
    insights: [
      "Max CPA $45 (ROAS 5× on $230); monthly ad cap $320",
      "Younger demographic (18-34) — focus on preventative treatments",
      "Revenue potential $1,840/mo (P50: 8 × $230)",
      "Video-first platform — invest in quality production",
    ],
  },
  {
    id: "google",
    name: "Google Ads",
    color: "#4285F4",
    icon:
      "M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z",
    overview:
      "Capture high-intent searchers actively looking for aesthetic treatments in your area.",
    kpis: ["Cost per Conversion: $25-45", "Conversion Rate: 8-15%", "Call Rate: 12-18%"],
    nextSteps: ["Optimize landing pages", "Add call extensions", "Track phone conversions"],
    insights: [
      "Max CPA $65 (ROAS 5× on $330); monthly ad cap $450",
      "High intent searches — capitalize on immediate booking interest",
      "Revenue potential $2,310/mo (P50: 7 × $330)",
      "Strong phone call volume — ensure staff handles inquiries promptly",
    ],
  },
];

const adVariations: Record<PlatformID, AdVariation[]> = {
  facebook: [
    { headline: "Affordable Filler Consultations Await You!", body: "Discover the benefits of fillers without hidden fees. Our transparent pricing and flexible payment plans make it easy for you to enhance your beauty without breaking the bank." },
    { headline: "Honest Pricing for Beautiful Results!", body: "At our medspa, we prioritize your budget. Enjoy clear, upfront pricing on filler treatments, with no surprises." },
    { headline: "Transform Your Look Within Your Budget!", body: "Don't let cost hold you back from feeling your best. We offer budget-friendly options and flexible payment plans for our filler treatments." },
  ],
  instagram: [
    { headline: "See Your Best Self in the Mirror", body: "Real results, real confidence. Swipe to see before & after transformations from our expert aesthetic treatments." },
    { headline: "Your Glow-Up Starts Here", body: "Expert care meets stunning results. Book your consultation and discover treatments tailored to your beauty goals." },
    { headline: "Beauty That Speaks for Itself", body: "Premium aesthetic treatments with personalized care. Transform your look with our expert injectors." },
  ],
  tiktok: [
    { headline: "The Treatment Everyone's Talking About", body: "Real people, real results. See why thousands trust us for their aesthetic treatments. Book your consultation today!" },
    { headline: "Your Before & After Moment Awaits", body: "Get the glow everyone's asking about. Quick treatments, amazing results. Tap to book your transformation!" },
    { headline: "This Is Your Sign to Book That Appointment", body: "Stop scrolling, start glowing! Expert treatments that fit your vibe and your budget. Link in bio!" },
  ],
  google: [
    { headline: "Top-Rated Medspa Near You | Book Today", body: "Searching for expert aesthetic treatments? We're here. Professional injectors, premium results, flexible scheduling." },
    { headline: "Botox & Filler Experts in [Your Area]", body: "Immediate appointments available. Board-certified providers, transparent pricing, proven results. Call now to book." },
    { headline: "Transform Your Look | Free Consultation", body: "Looking for aesthetic treatments nearby? Start with a complimentary consultation. Same-week availability." },
  ],
};

/* =========================
   Component
========================= */
export default function PrescriptiveCampaignFlow({ initialZip }: Props) {
  const router = useRouter();

  // Precompute from props to avoid a mount-time "flash"
  const initialZipResult = initialZip ? zipResults.find((r) => r.zip === initialZip) : null;

  const [view, setView] = useState<"dashboard" | "campaign">(
    initialZipResult ? "campaign" : "dashboard"
  );
  const [selectedZip, setSelectedZip] = useState<ZipResult | null>(initialZipResult);
  const [activePlatform, setActivePlatform] = useState<PlatformID | null>(
    initialZipResult?.topPlatform.id || null
  );
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, itemName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const handleStartCampaign = (zip: ZipResult, platformId: PlatformID) => {
    setSelectedZip(zip);
    setActivePlatform(platformId);
    setView("campaign");
  };

  const currentPlatform =
    activePlatform ? platforms.find((p) => p.id === activePlatform) || null : null;

  /* ========== Campaign View (single page) ========== */
  if (view === "campaign" && currentPlatform && selectedZip) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back to home */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            type="button"
            aria-label="Back to home"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div style={{ backgroundColor: currentPlatform.color }} className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7" style={{ color: currentPlatform.color }} fill="currentColor" viewBox="0 0 24 24">
                      <path d={currentPlatform.icon} />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wide mb-1">
                      {currentPlatform.name} Campaign
                    </div>
                    <h2 className="text-lg text-white/90">
                      ZIP {selectedZip.zip} • {selectedZip.cohort}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {platforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setActivePlatform(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          p.id === activePlatform ? "bg-white text-gray-900 shadow-md" : "text-white/70 hover:text-white hover:bg-white/20"
                        }`}
                      >
                        {p.name}
                        {p.id === selectedZip.topPlatform.id && <span className="text-yellow-300">⭐</span>}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-1 bg-white/20 text-sm font-medium text-white rounded">
                    {selectedZip.matchScore}% Match
                  </div>
                </div>
              </div>
            </div>

            {/* One-page content (consistent comfy type) */}
            <div className="p-8 space-y-8 text-[1.125rem] leading-8">
              {/* Strategy Overview */}
              <section
                className="p-6 rounded-xl border"
                style={{
                  background: `linear-gradient(to bottom right, ${currentPlatform.color}10, white)`,
                  borderColor: `${currentPlatform.color}30`,
                }}
              >
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Strategy Overview
                </h3>
                <p className="text-gray-800">{currentPlatform.overview}</p>

                <div className="grid md:grid-cols-3 gap-4 mt-5">
                  {currentPlatform.kpis.map((kpi, idx) => {
                    const [label, value] = kpi.split(":");
                    return (
                      <div key={idx} className="text-gray-800">
                        <span className="font-semibold text-gray-900">{label}:</span>
                        <span> {value}</span>
                      </div>
                    );
                  })}
                </div>

                {currentPlatform.insights.length > 0 && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: `${currentPlatform.color}20` }}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Key Insights
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentPlatform.insights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-green-500" : idx === 2 ? "bg-purple-500" : "bg-orange-500"
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
                  background: `linear-gradient(to bottom right, ${currentPlatform.color}08, white)`,
                  borderColor: `${currentPlatform.color}20`,
                }}
              >
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recommended Actions
                </h3>
                <ul className="space-y-3">
                  {currentPlatform.nextSteps.map((step, idx) => (
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
                  Ad Copy Variations
                </h3>

                {/* Full-width cards */}
                <ul className="w-full space-y-5">
                  {(adVariations[currentPlatform.id] || adVariations.facebook).map((ad, idx) => (
                    <li key={idx} className="relative rounded-xl border border-gray-200 p-6">
                      {/* Colored Copy button */}
                      <button
                        onClick={() => copyToClipboard(`${ad.headline}\n\n${ad.body}`, `ad-${idx}`)}
                        className="absolute right-4 top-4 rounded-md px-3 py-1 text-xs font-semibold text-white shadow-sm hover:brightness-95 focus:outline-none"
                        style={{ backgroundColor: currentPlatform.color }}
                      >
                        {copiedItem === `ad-${idx}` ? "Copied" : "Copy"}
                      </button>

                      {/* Keep text readable but let the card be full-width */}
                      <div className="max-w-[90ch] pr-24">
                        <h4 className="text-2xl font-semibold text-gray-900 mb-2">{ad.headline}</h4>
                        <p className="text-[1.125rem] text-gray-800 leading-8">{ad.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>


              {/* Creative (moved to same page, same type scale) */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Images</div>
                    <div className="space-y-2 text-gray-800">
                      <div>• Before/after results</div>
                      <div>• Staff consultation photos</div>
                      <div>• Pricing transparency graphics</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Videos</div>
                    <div className="space-y-2 text-gray-800">
                      <div>• Client testimonials</div>
                      <div>• Treatment walkthroughs</div>
                      <div>• Office tour videos</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Photography Brief
                    </div>
                    <p className="text-gray-800">
                      Bright, authentic imagery showcasing real results and approachable staff.
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Video Concept
                    </div>
                    <p className="text-gray-800">
                      Educational content emphasizing transparency and client success stories.
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

  /* ========== Dashboard View ========== */
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Top Target Areas</h1>
          <p className="text-gray-600">Click to launch campaign</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {zipResults.map((result, index) => (
            <div
              key={result.zip}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow flex flex-col"
            >
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold text-gray-900">#{index + 1}</div>
                    <div className="h-8 w-px bg-gray-300" />
                    <h3 className="text-xl font-bold text-gray-900">ZIP {result.zip}</h3>
                  </div>
                  <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg">
                    {result.matchScore}% Match
                  </div>
                </div>
                <div className="text-sm text-gray-500 pl-16">{result.area}, Nassau County</div>
              </div>

              {/* Cohort Badge */}
              <div className="mb-5">
                <div
                  className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: result.cohortColor }}
                >
                  {result.cohort}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
                <div>
                  <div className="text-2xl font-bold text-gray-900">8.8</div>
                  <div className="text-xs text-gray-500 mt-1">miles away</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">Low</div>
                  <div className="text-xs text-gray-500 mt-1">competition</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">$2.6K</div>
                  <div className="text-xs text-gray-500 mt-1">monthly</div>
                </div>
              </div>

              {/* Insight */}
              <div className="mb-5 flex-grow">
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{result.insight}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {index === 0 && (
                    <>
                      <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">High online research behavior</span>
                      <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Price-sensitive</span>
                    </>
                  )}
                  {index === 1 && (
                    <>
                      <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">Premium aesthetic focus</span>
                      <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Social proof driven</span>
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">Strong referral network</span>
                      <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded">Value-conscious</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-medium">
                    Best channel: {result.topPlatform.id.charAt(0).toUpperCase() + result.topPlatform.id.slice(1)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleStartCampaign(result, result.topPlatform.id)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                Generate Campaign
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


