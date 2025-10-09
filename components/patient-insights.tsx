// app/(whoever)/PatientInsights.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart as GrowthIcon,
  Users as AudienceIcon,
  BadgeDollarSign as RevenueIcon,
  Target as TargetIcon,
  MapPin as GeoIcon,
  ChartNoAxesCombined as InsightIcon,
  Sparkles as ActionIcon,
  ChevronRight as ArrowIcon,
} from "lucide-react";
import Navigation from "@/components/navigation";

/* ---------- tiny UI helpers ---------- */

const IconPill = ({
  children,
  tone = "indigo",
}: {
  children: React.ReactNode;
  tone?: "indigo" | "blue" | "slate" | "violet" | "green" | "orange";
}) => {
  const tones: Record<string, string> = {
    indigo: "from-indigo-50 to-blue-50 border-indigo-100",
    blue: "from-blue-50 to-cyan-50 border-blue-100",
    slate: "from-slate-50 to-white border-slate-100",
    violet: "from-violet-50 to-fuchsia-50 border-fuchsia-100",
    green: "from-emerald-50 to-green-50 border-emerald-100",
    orange: "from-orange-50 to-amber-50 border-amber-100",
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl border bg-gradient-to-br px-2.5 py-1.5 shadow-sm transition hover:shadow-md ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const SectionCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const StatCard = ({
  title,
  value,
  tone = "indigo",
}: {
  title: string;
  value: React.ReactNode;
  tone?: "indigo" | "blue" | "green" | "orange";
}) => {
  const map: Record<string, string> = {
    indigo: "from-indigo-50 to-blue-50 text-indigo-900",
    blue: "from-blue-50 to-cyan-50 text-blue-900",
    green: "from-emerald-50 to-green-50 text-emerald-900",
    orange: "from-orange-50 to-amber-50 text-amber-900",
  };
  const textMap: Record<string, string> = {
    indigo: "text-indigo-600",
    blue: "text-blue-600",
    green: "text-emerald-600",
    orange: "text-amber-600",
  };
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${map[tone]}`}>
      <div className={`text-sm font-semibold ${textMap[tone]}`}>{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="w-32 rounded-full bg-slate-200/60 h-2">
    <div
      className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

/* ---------- types ---------- */

type InsightPattern = {
  type: "concentration" | "geographic" | "behavioral" | "opportunity" | "channel" | string;
  title: string;
  description: string;
  action: string;
  confidence: number; // 0..1
  value: number; // potential $
};

type TargetZip = {
  zip: string;
  cohort: string;
  matchScore: number;
  patientCount: number;
  avgValue: number;
  revenue: number;
};

type Psychographics = {
  acceptanceScore?: number;
  acceptanceInsight?: string;
  valueMultiplier?: number;
  marketInsight?: string;
  channels?: { name: string; percentage: number; avgSpend: number; patientType: string }[];
  clusters?: { name: string; percentage: number; ltv: number; bestChannel: string }[];
  keyInsight?: string;
};

type Playbook = {
  channels?: { name: string; allocation: number; rationale?: string }[];
  messaging?: { theme: string; message: string; target?: string }[];
};

type PatientIntelResponse = {
  summary?: {
    totalPatients?: number;
    bestPatientCount?: number;
    revenueConcentration?: number;
    avgBestPatientValue?: number;
  };
  insights?: {
    patterns?: InsightPattern[];
    opportunities?: { title: string; description: string; action: string; value: number }[];
    expansion?: { 
      targetZips?: TargetZip[];
      untappedZips?: any[];
    };
    // ADD THIS SECTION:
    psychographics?: {
      acceptanceScore: number;
      acceptanceInsight: string;
      valueMultiplier: number;
      marketInsight: string;
      channels: Array<{
        name: string;
        percentage: number;
        avgSpend: number;
        patientType: string;
      }>;
      clusters: Array<{
        name: string;
        percentage: number;
        ltv: number;
        bestChannel: string;
      }>;
      keyInsight: string;
    } | null;
  };
  playbook?: Playbook;
};

/* ---------- component ---------- */

export default function PatientInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<PatientIntelResponse | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState("all");

  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [selectedZips, setSelectedZips] = useState<string[]>([]);

  const procedures = [
    { value: "all", label: "All Procedures" },
    { value: "botox", label: "Botox" },
    { value: "filler", label: "Fillers" },
    { value: "coolsculpting", label: "CoolSculpting" },
    { value: "laser", label: "Laser" },
    { value: "chemical-peel", label: "Chemical Peel" },
  ];

  const formatCurrency = (amount?: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  const getConfidencePill = (c: number) => {
    if (c >= 0.9) return "text-emerald-700 bg-emerald-50 border-emerald-100";
    if (c >= 0.8) return "text-blue-700 bg-blue-50 border-blue-100";
    if (c >= 0.7) return "text-amber-700 bg-amber-50 border-amber-100";
    return "text-slate-700 bg-slate-50 border-slate-100";
  };

  const iconForPattern = (t: string) => {
    const base = "h-4 w-4";
    const common = { strokeWidth: 1.5 } as const;
    switch (t) {
      case "concentration":
        return <AudienceIcon {...common} className={`${base} text-indigo-600`} />;
      case "geographic":
        return <GeoIcon {...common} className={`${base} text-blue-600`} />;
      case "behavioral":
        return <GrowthIcon {...common} className={`${base} text-violet-600`} />;
      case "opportunity":
        return <TargetIcon {...common} className={`${base} text-emerald-600`} />;
      case "channel":
        return <ActionIcon {...common} className={`${base} text-fuchsia-600`} />;
      default:
        return <InsightIcon {...common} className={`${base} text-slate-600`} />;
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/patient-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedure: selectedProcedure === "all" ? undefined : selectedProcedure,
          useTestData: true,
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

  /* ---------- loading ---------- */

  if (loading && !insights) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <p className="mt-4 text-slate-600">Analyzing patient data…</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-7xl">
            <SectionCard className="p-6">
              <div className="text-slate-600">No insights yet.</div>
            </SectionCard>
          </div>
        </div>
      </>
    );
  }

  /* ---------- UI ---------- */

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <SectionCard className="mb-6 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Patient Intelligence</h1>
                <p className="mt-1 text-slate-600">
                  Clear, actionable insights tailored to{" "}
                  <span className="font-semibold">
                    {selectedProcedure === "all" ? "all procedures" : selectedProcedure}
                  </span>
                  .
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedProcedure}
                  onChange={(e) => setSelectedProcedure(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {procedures.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {selectedProcedure !== "all" && (
                  <div className="hidden md:block">
                    <IconPill tone="orange">
                      <ActionIcon className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                    </IconPill>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatCard title="Total Patients" value={insights.summary?.totalPatients ?? 0} tone="indigo" />
              <StatCard title="Top 20% Patients" value={insights.summary?.bestPatientCount ?? 0} tone="blue" />
              <StatCard title="Revenue Concentration" value={`${insights.summary?.revenueConcentration ?? 0}%`} tone="green" />
              <StatCard title="Best Patient Value" value={formatCurrency(insights.summary?.avgBestPatientValue)} tone="orange" />
            </div>
          </SectionCard>

          {/* Patterns */}
          <SectionCard className="mb-6 p-6">
            <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
              <IconPill tone="violet">
                <InsightIcon className="h-4 w-4 text-violet-600" strokeWidth={1.5} />
              </IconPill>
              <span className="ml-2">Key Patterns & Insights</span>
            </h2>

            <div className="space-y-4">
              {(insights.insights?.patterns ?? [])
                .slice(0, showAllPatterns ? undefined : 2) /* capped preview */
                .map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-100 p-4 transition-shadow hover:shadow-md"
                  >
                    {/* ... keep all the existing pattern content ... */}
                  </div>
                ))}
            </div>

            {(insights.insights?.patterns ?? []).length > 2 && (
              <button
                onClick={() => setShowAllPatterns(!showAllPatterns)}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                {showAllPatterns
                  ? "Show less"
                  : `Show ${(insights.insights?.patterns ?? []).length - 2} more insights`}
              </button>
            )}
          </SectionCard>

          {/* Growth Opportunities */}
          <SectionCard className="mb-6 p-6">
            <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
              <IconPill tone="green">
                <TargetIcon className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
              </IconPill>
              <span className="ml-2">Growth Opportunities</span>
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(insights.insights?.opportunities ?? []).map((o, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 p-4"
                >
                  <h3 className="mb-1 font-semibold text-emerald-900">{o.title}</h3>
                  <p className="mb-3 text-sm text-emerald-700">{o.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-700">{o.action}</span>
                    <span className="font-bold text-emerald-900">+{formatCurrency(o.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Target Zips */}
          {insights.insights?.expansion?.targetZips && (
            <SectionCard className="mb-6 p-6">
              <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
                <IconPill tone="blue">
                  <GeoIcon className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                </IconPill>
                <span className="ml-2">Top Target ZIP Codes</span>
              </h2>

              {/* CHANGED: from grid to vertical list */}
              <div className="space-y-3">
                {(insights.insights.expansion.targetZips as TargetZip[]).map((z, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      id={`zip-${z.zip}`}
                      checked={selectedZips.includes(z.zip)}
                      onChange={(e) =>
                        e.target.checked
                          ? setSelectedZips([...selectedZips, z.zip])
                          : setSelectedZips(selectedZips.filter((zip) => zip !== z.zip))
                      }
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-slate-300"
                    />

                    {/* Row content */}
                    <label htmlFor={`zip-${z.zip}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-slate-900">{z.zip}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              z.cohort === "Luxury Clients"
                                ? "bg-violet-100 text-violet-700"
                                : z.cohort === "Comfort Spenders"
                                ? "bg-blue-100 text-blue-700"
                                : z.cohort === "Budget Conscious"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {z.cohort}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-slate-500">Patients: </span>
                            <span className="font-semibold text-slate-900">{z.patientCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Avg: </span>
                            <span className="font-semibold text-slate-900">{formatCurrency(z.avgValue)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Revenue: </span>
                            <span className="font-semibold text-emerald-600">{formatCurrency(z.revenue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Match:</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 rounded-full bg-slate-200/60 h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300"
                                  style={{ width: `${z.matchScore}%` }}
                                />
                              </div>
                              <span className="font-semibold text-sm text-slate-900">{z.matchScore}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Psychographic Analysis (optional block, shown once using overall data if present) */}
              {insights.insights?.psychographics && (
                <SectionCard className="mt-6 p-6">
                  <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
                    <IconPill tone="orange">
                      <ActionIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
                    </IconPill>
                    <span className="ml-2">Psychographic Analysis</span>
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
                      <h3 className="text-sm font-semibold text-orange-900 mb-2">Market Acceptance Score</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-orange-900">
                          {insights.insights.psychographics.acceptanceScore}
                        </span>
                        <span className="text-sm text-orange-700">/100</span>
                      </div>
                      <p className="text-xs text-orange-700">
                        {insights.insights.psychographics.acceptanceInsight}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                      <h3 className="text-sm font-semibold text-emerald-900 mb-2">Market Potential</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-emerald-900">
                          {insights.insights.psychographics.valueMultiplier}x
                        </span>
                        <span className="text-sm text-emerald-700">value range</span>
                      </div>
                      <p className="text-xs text-emerald-700">
                        {insights.insights.psychographics.marketInsight}
                      </p>
                    </div>
                  </div>

                  {insights.insights.psychographics.channels && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Channel Performance</h3>
                      <div className="grid md:grid-cols-3 gap-3">
                        {insights.insights.psychographics.channels.map((channel, i) => (
                          <div key={i} className="p-3 rounded-lg border border-slate-100 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-900">{channel.name}</span>
                              <span className="text-sm font-semibold text-indigo-600">
                                {channel.percentage}%
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Avg: {formatCurrency(channel.avgSpend)} • {channel.patientType}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.insights.psychographics.clusters && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Patient Segments</h3>
                      <div className="space-y-2">
                        {insights.insights.psychographics.clusters.map((cluster, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                            <div>
                              <span className="font-medium text-slate-900">{cluster.name}</span>
                              <span className="ml-2 text-xs text-slate-600">({cluster.percentage}%)</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-600">LTV: {formatCurrency(cluster.ltv)}</span>
                              <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                                {cluster.bestChannel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.insights.psychographics.keyInsight && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-900">
                        <span className="font-semibold">💡 Key Insight:</span>{" "}
                        {insights.insights.psychographics.keyInsight}
                      </p>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Selection bar */}
              {selectedZips.length > 0 && (
                <div className="mt-4 flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="text-sm text-purple-900 font-medium">
                    {selectedZips.length} ZIP{selectedZips.length !== 1 ? "s" : ""} selected for campaign
                  </span>
                  <Link
                    href={`/campaign-intel?zips=${selectedZips.join(",")}&procedure=${selectedProcedure}`}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    Generate Campaign Strategy
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </>
  );
}

