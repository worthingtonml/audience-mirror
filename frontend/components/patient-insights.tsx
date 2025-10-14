"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { LineChart, Users, BadgeDollarSign, Target, MapPin, Activity } from "lucide-react";
import Navigation from "@/components/navigation";
import { Tooltip } from "@/components/Tooltip";

const IconPill = ({
  children,
  tone = "indigo",
}: {
  children: ReactNode;
  tone?: string;
}) => {
  const tones: Record<string, string> = {
    indigo: "from-indigo-50 to-blue-50 border-indigo-100",
    violet: "from-violet-50 to-fuchsia-50 border-fuchsia-100",
    green: "from-emerald-50 to-green-50 border-emerald-100",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl border bg-gradient-to-br px-2.5 py-1.5 shadow-sm ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const SectionCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

type InsightPattern = {
  type: string;
  title: string;
  description: string;
  action: string;
  value: number;
};

type HeroInsight = {
  id:
    | "profile"
    | "behavior"
    | "geography"
    | "concentration"
    | "cohort"
    | "basket"
    | "geo"
    | "channel";
  icon: string;
  title: string;
  stat: string;
  sub: string;
  metrics?: any;
};

type PatientIntelResponse = {
  summary?: {
    totalPatients?: number;
    revenueConcentration?: number;
    avgBestPatientValue?: number;
    avgOverallValue?: number;
    multiplier?: number;
  };
  insights?: {
    heroInsights?: HeroInsight[];
    patterns?: InsightPattern[];
    opportunities?: {
      title: string;
      description: string;
      action: string;
      value: number;
    }[];
  };
};

export default function PatientInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<PatientIntelResponse | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState("all");
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [dataSource, setDataSource] = useState<"none" | "uploaded" | "test">("none");

  const procedures = [
    { value: "all", label: "All Procedures" },
    { value: "botox", label: "Botox" },
  ];

  const formatCurrency = (amount?: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount ?? 0);

  const iconForPattern = (t: string) => {
    switch (t) {
      case "concentration":
        return <Users className="h-4 w-4 text-indigo-600" strokeWidth={1.5} />;
      case "geographic":
        return <MapPin className="h-4 w-4 text-blue-600" strokeWidth={1.5} />;
      case "behavioral":
        return <LineChart className="h-4 w-4 text-violet-600" strokeWidth={1.5} />;
      case "opportunity":
        return <Target className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" strokeWidth={1.5} />;
    }
  };

  const exportZIPsToCSV = (opportunity: any) => {
    const zipMatch = opportunity.description.match(/ZIPs?: ([\d, ]]+)/);
    const zips = zipMatch ? zipMatch[1].split(",").map((z: string) => z.trim()) : [];

    if (zips.length === 0) {
      alert("No ZIP codes found in this opportunity");
      return;
    }

    const csvHeader = "zip_code,country,profile,opportunity_value\n";
    const csvRows = zips
      .map((zip) => `${zip},US,Young Professionals - Premium Single,${opportunity.value}`)
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `target-zips-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const uploadedData = sessionStorage.getItem("patientData");
      setDataSource(uploadedData ? "uploaded" : "test");

      const res = await fetch("http://127.0.0.1:8000/api/patient-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedure: selectedProcedure === "all" ? undefined : selectedProcedure,
          useTestData: !uploadedData,
          patientData: uploadedData ? JSON.parse(uploadedData) : undefined,
        }),
      });

      const data: PatientIntelResponse = await res.json();
      setInsights(data);
    } catch (e) {
      console.error("Error fetching insights:", e);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProcedure]);

  const calculateTotalRevenue = () => {
    if (!insights?.summary) return 0;
    const { totalPatients = 0, avgOverallValue = 0 } = insights.summary;
    return totalPatients * avgOverallValue;
  };

  const totalRevenue = calculateTotalRevenue();

  if (loading && !insights) {
    return (
      <>
        <Navigation />
        <div className="grid min-h-screen place-items-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
            <p className="mt-4 text-slate-600">Analyzing patient data…</p>
          </div>
        </div>
      </>
    );
  }

  if (!insights) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-7xl">
            <SectionCard className="p-6">
              <div className="text-slate-600">No insights available. Please add patient data.</div>
            </SectionCard>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* KPI header */}
          <SectionCard className="mb-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Patient Intelligence</h1>
                <p className="mt-1 text-slate-600">
                  Insights for {selectedProcedure === "all" ? "all procedures" : selectedProcedure}
                  {dataSource === "uploaded" && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Your Data
                    </span>
                  )}
                </p>
              </div>

              <select
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 shadow-sm"
              >
                {procedures.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
                <div className="text-sm font-semibold text-indigo-600">Total Revenue</div>
                <div className="mt-1 text-2xl font-bold text-indigo-900">{formatCurrency(totalRevenue)}</div>
                <div className="mt-2 text-xs text-indigo-700">
                  From {insights.summary?.totalPatients ?? 0} patients
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
                <div className="text-sm font-semibold text-blue-600">Value Multiplier</div>
                <div className="mt-1 text-2xl font-bold text-blue-900">
                  {(insights.summary?.multiplier ?? 1).toFixed(1)}×
                </div>
                <div className="mt-2 text-xs text-blue-700">
                  Top 20% worth {((insights.summary?.multiplier ?? 1) * 100 - 100).toFixed(0)}% more
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                <div className="text-sm font-semibold text-emerald-600">Revenue Concentration</div>
                <div className="mt-1 text-2xl font-bold text-emerald-900">
                  {insights.summary?.revenueConcentration ?? 0}%
                </div>
                <div className="mt-2 text-xs text-emerald-700">Top 20% of patients</div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4">
                <div className="flex items-center text-sm font-semibold text-amber-600">
                  Target Patient Value
                  <Tooltip text="Lifetime value of your top 20% patients. This is your benchmark for identifying high-value customer profiles." />
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-900">
                  {formatCurrency(insights.summary?.avgBestPatientValue)}
                </div>
                <div className="mt-2 text-xs text-amber-700">Your benchmark LTV</div>
              </div>
            </div>
          </SectionCard>

          {/* Dominant Profile & Insights */}
          <SectionCard className="mb-6 p-6">
            {insights.insights?.heroInsights && insights.insights.heroInsights.length > 0 && (
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white shadow-lg">
                <div className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm">
                  DOMINANT CUSTOMER PROFILE
                </div>

                <h1 className="mb-4 text-3xl font-bold">
                  {insights.insights.heroInsights.find((h) => h.id === "profile")?.stat || "Premium Customers"}
                </h1>

                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(insights.summary?.avgBestPatientValue)}</div>
                    <div className="text-sm opacity-90">Avg LTV</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">2.5×</div>
                    <div className="text-sm opacity-90">Yearly visits</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">21,000</div>
                    <div className="text-sm opacity-90">Households</div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed opacity-95">
                  {insights.insights.heroInsights.find((h) => h.id === "profile")?.sub ||
                    "Your highest-value patient segment"}
                </p>
              </div>
            )}

            <h2 className="mb-6 flex items-center text-xl font-semibold text-slate-900">
              <IconPill tone="violet">
                <Activity className="h-4 w-4 text-violet-600" strokeWidth={1.5} />
              </IconPill>
              <span className="ml-2">Key Patterns &amp; Insights</span>
            </h2>

            {insights.insights?.heroInsights && insights.insights.heroInsights.length > 0 ? (
              <>
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {insights.insights.heroInsights.map((insight) => {
                    const IconComponent =
                      insight.icon === "Users"
                        ? Users
                        : insight.icon === "Package"
                        ? BadgeDollarSign
                        : insight.icon === "MapPin"
                        ? MapPin
                        : LineChart;

                    /**
                     * GEOGRAPHY — calm, clear, *no duplicates*, plain-English labels
                     */
                    if (insight.id === "geography") {
                      const m = insight.metrics || {};
                      const currentHH: number = m?.currentMarket?.households ?? 7000;
                      const expansionHH: number = m?.expansionOpportunity?.households ?? 21000;
                      const totalHH = Math.max(currentHH + expansionHH, 0);

                      const rawProven: Array<{ zip: string; city?: string }> = m?.currentMarket?.zips ?? [];
                      const rawHigh: Array<{ zip: string; city?: string }> = m?.expansionOpportunity?.zips ?? [];

                      // unique-by-zip helper
                      const uniq = (arr: Array<{ zip: string; city?: string }>) => {
                        const seen = new Set<string>();
                        const out: Array<{ zip: string; city?: string }> = [];
                        for (const z of arr) {
                          if (!seen.has(z.zip)) {
                            seen.add(z.zip);
                            out.push(z);
                          }
                        }
                        return out;
                      };

                      const provenU = uniq(rawProven);
                      // remove any proven zips from high list to prevent cross-duplication
                      const provenSet = new Set(provenU.map((z) => z.zip));
                      const highU = uniq(rawHigh).filter((z) => !provenSet.has(z.zip));

                      const showProven = provenU.slice(0, 2);
                      const showHigh = highU.slice(0, 3);
                      const moreHigh = Math.max(highU.length - showHigh.length, 0);
                      const moreProven = Math.max(provenU.length - showProven.length, 0);

                      const compact = (n: number) =>
                        Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
                      const full = (n: number) => Intl.NumberFormat("en-US").format(n);

                      const ZipChip = ({ z, tone = "slate" }: { z: { zip: string; city?: string }; tone?: "slate" | "indigo" }) => {
                        const base =
                          tone === "indigo"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                            : "border-slate-200 bg-white text-slate-800";
                        // only show city if it's present AND different from the zip string
                        const showCity = z.city && z.city !== z.zip;
                        return (
                          <span className={`rounded-md border px-2 py-1 text-xs ${base}`}>
                            <span className="font-mono font-semibold">{z.zip}</span>
                            {showCity ? <span className="ml-1.5 opacity-70">· {z.city}</span> : null}
                          </span>
                        );
                      };

                      return (
                        <div key={insight.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                          {/* Header */}
                          <div className="mb-5 flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                                <MapPin className="h-5 w-5 text-white" strokeWidth={2} />
                              </div>
                              <div>
                                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                  {insight.title}
                                </div>
                                <div className="text-xl font-bold text-slate-900">{insight.stat}</div>
                              </div>
                            </div>
                            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              High Match
                            </span>
                          </div>

                          {/* Two simple numbers with plain-English captions */}
                          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="text-xs text-slate-500">Current reach</div>
                              <div className="mt-0.5 text-xl font-bold text-slate-900">{compact(currentHH)}</div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                Households in ZIPs you already serve
                              </div>
                            </div>
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                              <div className="text-xs text-indigo-600">With expansion</div>
                              <div className="mt-0.5 text-xl font-bold text-indigo-900">{compact(totalHH)}</div>
                              <div className="mt-1 text-[11px] text-indigo-700">
                                Adds nearby ZIPs with similar households
                              </div>
                            </div>
                          </div>

                          {/* One-sentence explainer */}
                          <p className="text-sm text-slate-700">
                            You reach <span className="font-semibold">{full(currentHH)}</span> households today.
                            Matching nearby ZIPs add{" "}
                            <span className="font-semibold">{full(expansionHH)}</span> more, for{" "}
                            <span className="font-semibold">{full(totalHH)}</span> potential reach.
                          </p>

                          {/* ZIP chips — no duplicates, clearer section titles */}
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {showProven.length > 0 && (
                              <div>
                                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  ZIPs you already serve
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {showProven.map((z, i) => (
                                    <ZipChip key={`p-${i}-${z.zip}`} z={z} tone="slate" />
                                  ))}
                                  {moreProven > 0 && (
                                    <span className="text-xs text-slate-500">+{moreProven} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {showHigh.length > 0 && (
                              <div>
                                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Nearby ZIPs with similar households
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {showHigh.map((z, i) => (
                                    <ZipChip key={`h-${i}-${z.zip}`} z={z} tone="indigo" />
                                  ))}
                                  {moreHigh > 0 && (
                                    <span className="text-xs text-slate-500">+{moreHigh} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Subtle footer context */}
                          <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-600">{insight.sub}</p>
                        </div>
                      );
                    }

                    // Default rendering for other cards
                    return (
                      <div key={insight.id} className="rounded-lg border border-slate-200 bg-white p-5">
                        <div className="flex items-start gap-4">
                          <div className="rounded-lg bg-slate-100 p-2.5">
                            <IconComponent className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1">
                            <div className="mb-1 text-xs font-medium uppercase text-slate-500">{insight.title}</div>
                            <div className="mb-1 text-xl font-semibold text-slate-900">{insight.stat}</div>
                            <div className="text-sm text-slate-600">{insight.sub}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {insights.insights?.patterns && insights.insights.patterns.length > 0 && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="mb-4 text-base font-semibold text-slate-900">Additional Patterns</h3>
                    <div className="space-y-3">
                      {insights.insights.patterns
                        .slice(0, showAllPatterns ? undefined : 2)
                        .map((p, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  {iconForPattern(p.type)}
                                  <h4 className="text-sm font-semibold text-slate-900">{p.title}</h4>
                                </div>
                                <p className="mb-2 text-sm text-slate-600">{p.description}</p>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-500">{p.action}</span>
                                  <span className="font-semibold text-slate-900">+{formatCurrency(p.value)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {insights.insights.patterns.length > 2 && (
                      <button
                        onClick={() => setShowAllPatterns(!showAllPatterns)}
                        className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {showAllPatterns ? "Show less" : `Show ${insights.insights.patterns.length - 2} more`}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500">
                No insights available. Add patient data to see insights.
              </div>
            )}
          </SectionCard>

          {insights.insights?.opportunities && insights.insights.opportunities.length > 0 && (
            <div id="growth-opportunities" className="scroll-mt-6">
              <SectionCard className="p-6">
                <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
                  <IconPill tone="green">
                    <Target className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                  </IconPill>
                  <span className="ml-2">Growth Opportunities</span>
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {insights.insights.opportunities.map((o, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5"
                    >
                      <div className="mb-3">
                        <h3 className="mb-2 font-semibold text-emerald-900">{o.title}</h3>
                        <p className="text-sm text-emerald-700">{o.description}</p>
                      </div>

                      <div className="mb-3 flex items-center justify-between border-t border-emerald-200 pt-3">
                        <span className="text-xs font-medium text-emerald-700">{o.action}</span>
                        <span className="font-bold text-emerald-900">+{formatCurrency(o.value)}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open("/campaign-generator", "_blank")}
                          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          Create Campaign
                        </button>
                        <button
                          onClick={() => exportZIPsToCSV(o)}
                          className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                        >
                          Export ZIPs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      </div>
    </>
  );
}






