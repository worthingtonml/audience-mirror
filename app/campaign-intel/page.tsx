// app/campaign-intel/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/navigation";

/* ---------- lightweight types so TS stays quiet ---------- */
type PlatformBlock = {
  name: string;                // "facebook" | "instagram" | ...
  score: number;               // 0–100
  metrics: {
    ctr: string;               // "3.1%"
    cpl: string;               // "$12–$16"
    bookingRate: string;       // "21%"
    maxCpa: string;            // "$85"
    ltv: string;               // "$430"
    roas: string;              // "2.8x"
  };
  adCopy: string[];
  audiences: string[];
};

type CampaignData = {
  generatedAt: string;
  insights?: { type: "success" | "warning" | "info"; text: string }[];
  platforms: PlatformBlock[];
  creativeGuidance?: {
    primaryMessage: string;
    visualStyle: string;
    cta: string;
    notes: string;
  };
  patientIntelligence?: {
    topPerformingZip: string;
    recommendedChannel: string;
    avgPatientValue: number;
    dataPoints: number;
    keyPattern: string;
  };
};

export default function CampaignIntelPage() {
  const searchParams = useSearchParams();

  // Resolve params once to avoid re-renders from URLSearchParams identity
  const { zip, cohort, procedure } = useMemo(() => {
    return {
      zip: searchParams.get("zip") || "11030",
      cohort: searchParams.get("cohort") || "Comfort Spenders",
      procedure: searchParams.get("procedure") || "botox",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("facebook");
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/campaign-intel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zip, cohort, procedure }),
        });
        const data: CampaignData = await res.json();
        if (!mounted) return;
        setCampaignData(data);
        if (data?.platforms?.length) {
          setSelectedPlatform(data.platforms[0].name);
        }
      } catch (e) {
        console.error("Error fetching campaign data:", e);
        if (mounted) setCampaignData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [zip, cohort, procedure]);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 grid place-items-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
            <p className="mt-4 text-slate-600">Generating campaign intelligence…</p>
          </div>
        </div>
      </>
    );
  }

  if (!campaignData?.platforms?.length) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <h2 className="font-semibold text-rose-800">Unable to generate campaign</h2>
              <p className="mt-2 text-rose-700">
                Please verify the API and prediction server are running.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentPlatform =
    campaignData.platforms.find((p) => p.name === selectedPlatform) ||
    campaignData.platforms[0];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Campaign Intelligence</h1>
                <p className="mt-1 text-slate-600">
                  Optimized for <span className="font-medium">{procedure}</span> in ZIP{" "}
                  <span className="font-medium">{zip}</span> targeting{" "}
                  <span className="font-medium">{cohort}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Generated</div>
                <div className="text-sm font-medium text-slate-900">
                  {new Date(campaignData.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {campaignData.insights?.length ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {campaignData.insights.map((ins, i) => {
                  const tone =
                    ins.type === "success"
                      ? "emerald"
                      : ins.type === "warning"
                      ? "amber"
                      : "indigo";
                  const bg =
                    tone === "emerald"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : tone === "amber"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-indigo-50 border-indigo-200 text-indigo-800";
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 ${bg}`}
                    >
                      <p className="text-sm font-medium">{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Platform Selector */}
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Platform performance</h2>
            <div className="flex flex-wrap gap-2">
              {campaignData.platforms.map((p) => {
                const active = selectedPlatform === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPlatform(p.name)}
                    className={[
                      "px-4 py-2 rounded-xl font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    <span className="capitalize">{p.name}</span>
                    <span className={["ml-2 text-sm", active ? "opacity-90" : "opacity-70"].join(" ")}>
                      {Math.round(p.score)}% match
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform Details */}
          {currentPlatform && (
            <>
              {/* Metrics */}
              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  {currentPlatform.name.charAt(0).toUpperCase() + currentPlatform.name.slice(1)} metrics
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: "CTR", value: currentPlatform.metrics.ctr, tone: "indigo" },
                    { label: "Cost Per Lead", value: currentPlatform.metrics.cpl, tone: "emerald" },
                    { label: "Booking Rate", value: currentPlatform.metrics.bookingRate, tone: "blue" },
                    { label: "Max CPA", value: currentPlatform.metrics.maxCpa, tone: "amber" },
                    { label: "LTV", value: currentPlatform.metrics.ltv, tone: "violet" },
                    { label: "ROAS", value: currentPlatform.metrics.roas, tone: "fuchsia" },
                  ].map((m, i) => {
                    const color =
                      m.tone === "emerald"
                        ? "text-emerald-600"
                        : m.tone === "blue"
                        ? "text-blue-600"
                        : m.tone === "amber"
                        ? "text-amber-600"
                        : m.tone === "violet"
                        ? "text-violet-600"
                        : m.tone === "fuchsia"
                        ? "text-fuchsia-600"
                        : "text-indigo-600";
                    return (
                      <div key={i} className="rounded-xl bg-slate-50 p-3 text-center">
                        <div className={`text-2xl font-bold ${color}`}>{m.value}</div>
                        <div className="mt-1 text-xs text-slate-600">{m.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ad Copy */}
              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Ad copy variations</h3>
                <div className="space-y-3">
                  {currentPlatform.adCopy.map((copy, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="flex-1 text-slate-800">{copy}</p>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(copy);
                            setCopied(idx);
                            setTimeout(() => setCopied(null), 1200);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          aria-label="Copy ad copy"
                        >
                          {copied === idx ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Audiences */}
              <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Target audiences</h3>
                <div className="flex flex-wrap gap-2">
                  {currentPlatform.audiences.map((aud, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700"
                    >
                      {aud}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Creative Guidance */}
          {campaignData.creativeGuidance && (
            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Creative guidance</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-500">Primary message</div>
                  <p className="text-slate-800">{campaignData.creativeGuidance.primaryMessage}</p>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-500">Visual style</div>
                  <p className="text-slate-800">{campaignData.creativeGuidance.visualStyle}</p>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-500">Call to action</div>
                  <p className="font-semibold text-slate-900">
                    {campaignData.creativeGuidance.cta}
                  </p>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-500">Notes</div>
                  <p className="text-slate-800">{campaignData.creativeGuidance.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Patient Intelligence Summary */}
          {campaignData.patientIntelligence && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Patient intelligence insights
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-slate-600">Top ZIP</div>
                  <div className="font-semibold text-slate-900">
                    {campaignData.patientIntelligence.topPerformingZip}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Best channel</div>
                  <div className="font-semibold capitalize text-slate-900">
                    {campaignData.patientIntelligence.recommendedChannel}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Avg patient value</div>
                  <div className="font-semibold text-slate-900">
                    ${campaignData.patientIntelligence.avgPatientValue}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Data points</div>
                  <div className="font-semibold text-slate-900">
                    {campaignData.patientIntelligence.dataPoints} patients
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-indigo-200 pt-4">
                <div className="text-sm text-slate-600">Key pattern</div>
                <div className="font-medium text-slate-900">
                  {campaignData.patientIntelligence.keyPattern}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
