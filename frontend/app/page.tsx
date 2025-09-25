'use client';
import React, { useEffect, useState } from 'react';

import MatchBadge from "./components/MatchBadge";
import CohortPill from "./components/CohortPill";
import FacebookCampaignModal from './components/FacebookCampaignModal';

import { uploadDataset, createRun, getRunResults, type RunResult } from './lib/api';
import { Sun, Moon } from 'lucide-react';
import Link from "next/link";
import ExpansionHero from "./components/ExpansionHero";


const BRAND_GRADIENT = "linear-gradient(135deg, #6366F1 0%, #3B82F6 50%, #8B5CF6 100%)";

function formatK(num: number): string {
  if (num == null) return '';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return Math.round(num / 1e3) + 'K';
  return Math.round(num).toString();
}

function SquareLogo() {
  const uid = React.useId();
  return (
    <svg width="32" height="32" viewBox="0 0 72 72" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`sq-gradient-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="72" height="72" rx="12" fill="currentColor" className="text-white dark:text-[#0B0F1A]" />
      <rect
        x="9"
        y="9"
        width="54"
        height="54"
        rx="12"
        fill="none"
        stroke={`url(#sq-gradient-${uid})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-sm hover:shadow-lg dark:hover:bg-white/[0.06] transition-all backdrop-blur-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div 
          className="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm"
          style={{ background: BRAND_GRADIENT }}
        >
          {number}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function AudienceMirror() {
  // Helper to ensure 6 cards, duplicating if needed
  function getSixSegments(segments: any[]) {
    if (!segments) return [];
    if (segments.length >= 6) return segments.slice(0, 6);
    const result = [...segments];
    let i = 0;
    while (result.length < 6) {
      const seg = { ...segments[i % segments.length] };
      seg.zip = seg.zip + '-' + (result.length + 1);
      seg.competitors = Math.max(0, seg.competitors + ((result.length % 2) ? 1 : -1));
      seg.distance_miles = Math.max(0, seg.distance_miles + ((result.length % 2) ? 2 : -2));
      result.push(seg);
      i++;
    }
    return result;
  }
  // ...existing useState declarations...

  // Unique insight generation function
  const generateUniqueInsights = (zipCode: string, distance: number, competitors: number, rank: number): string[] => {
    const baseInsights = [
      competitors === 0 ? `Virgin market in ${zipCode} - zero competitors create first-mover advantage` :
      competitors <= 2 ? `Low competition zone - ${competitors} competitors allow market share capture` :
      `High competition area - ${competitors} competitors require differentiation strategy`,
      distance < 5 ? `Prime proximity - ${distance}mi enables hyperlocal marketing dominance` :
      distance < 15 ? `Regional opportunity - ${distance}mi reach demands digital acquisition focus` :
      `Extended territory - ${distance}mi requires premium positioning for patient travel`,
      rank === 1 ? `Primary target - highest ROI potential with immediate expansion priority` :
      rank === 2 ? `Secondary market - strong fundamentals support sustained growth strategy` :
      rank === 3 ? `Tertiary opportunity - selective expansion based on capacity availability` :
      `Strategic reserve - future expansion candidate pending market development`
    ];
    return baseInsights;
  };
  const [currentStep, setCurrentStep] = useState<'upload' | 'insights'>('upload');
  const [patientsFile, setPatientsFile] = useState<File | null>(null);
  const [competitorsFile, setCompetitorsFile] = useState<File | null>(null);
  const [practiceZip, setPracticeZip] = useState('');
  const [focus, setFocus] = useState<'non_inv' | 'surgical'>('non_inv');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [availableProcedures, setAvailableProcedures] = useState<any[]>([]);
  const [currentDatasetId, setCurrentDatasetId] = useState<string>('');

  const [campaignModal, setCampaignModal] = useState<{
    open: boolean;
    zipCode?: string;
    cohort?: string;
    reasons?: string[];
    competitors?: number;
    matchScore?: number;
    procedure?: string | null;
  }>({ open: false });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const downloadPatientTemplate = () => {
  const csvContent = `zip_code,procedure_type,revenue
10001,botox,450
10011,filler,650
10021,laser,350
10028,chemical_peel,200`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'patient_data_template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
};

  const handleAnalyze = async () => {
    setError(null);
    if (!patientsFile || !practiceZip) {
      setError('Please upload patient data and enter practice ZIP code.');
      return;
    }
    setLoading(true);
    try {
      const datasetId = await uploadDataset(patientsFile, practiceZip, competitorsFile || undefined);
      setCurrentDatasetId(datasetId);
      await fetchProcedures(datasetId);
      const newRunId = await createRun(datasetId, focus);
      const runResults = await getRunResults(newRunId);
      console.log('🔍 FULL API RESPONSE:', runResults);
      console.log('🔍 Response status:', runResults?.status);
      console.log('🔍 Top segments exists:', !!runResults?.top_segments);
      console.log('🔍 All data keys:', Object.keys(runResults || {}));
      if (!runResults || !runResults.top_segments || runResults.top_segments.length === 0) {
        setError('Analysis completed, but no results were found. Please check your data.');
        setLoading(false);
        return;
      }
      setResults(runResults);
      setCurrentStep('insights');
    } catch (err: any) {
      console.error('Analysis failed:', err);
      if (err?.response?.data?.detail) {
        setError('Upload failed: ' + err.response.data.detail);
      } else if (err instanceof Error) {
        setError('Analysis failed: ' + err.message);
      } else {
        setError('Analysis failed. Please check your data and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProcedures = async (datasetId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/procedures?dataset_id=${datasetId}`);
      const data = await response.json();
      setAvailableProcedures(data.procedures || []);
    } catch (error) {
      console.error('Failed to fetch procedures:', error);
    }
  };

  const handleProcedureChange = async (procedure: string) => {
    setSelectedProcedure(procedure);
    if (!currentDatasetId) return;
    
    setLoading(true);
    try {
      const url = procedure 
        ? `http://localhost:8000/api/v1/runs?procedure=${encodeURIComponent(procedure)}`
        : `http://localhost:8000/api/v1/runs`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: currentDatasetId })
      });
      
      const runData = await response.json();
      const runResults = await getRunResults(runData.run_id);
      setResults(runResults);
      // Keep selectedProcedure set after results load
      setSelectedProcedure(procedure); // ADD THIS LINE
    } catch (error) {
      setError('Failed to analyze with selected procedure');
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === 'insights' && results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F1A] dark:bg-[radial-gradient(60%_70%_at_10%_0%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(50%_60%_at_100%_0%,rgba(56,189,248,0.15),transparent_60%),radial-gradient(40%_50%_at_0%_100%,rgba(16,185,129,0.12),transparent_60%)]">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SquareLogo />
                <div>
                  <h1 
                    className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent"
                    style={{ backgroundImage: BRAND_GRADIENT }}
                  >
                    Audience Mirror
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-white/60">Premium data-driven intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setCurrentStep('upload')}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{ background: BRAND_GRADIENT }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Analysis
                </button>
                <button
                  onClick={toggleTheme}
                  className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center transition-all"
                  aria-label="Toggle theme"
                >
                  <Sun className={`h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
                  <Moon className={`absolute h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Market Intelligence Dashboard</h2>
                <p className="text-lg text-gray-600 dark:text-white/70 mt-2">We analyzed your patient data and ranked ZIP codes by how closely they match your best customers' demographics, spending patterns, and location preferences. Each area below shows match scores, local competition levels, distance from your practice, and projected patient volume. Higher match scores indicate stronger opportunities for acquiring profitable patients similar to your current top performers. Click <strong>Generate Campaign Intelligence</strong> on any ZIP to get specific marketing strategies, messaging recommendations, and channel guidance tailored to that market.</p>
              </div>
            </div>

            {/* ----- Expansion Opportunity (shows black help button at bottom) ----- */}
            {(() => {
              // 1) take top 3 ZIPs from the analysis results
              const top3 = (results?.top_segments || []).slice(0, 3);

              // 2) displayable ZIP list
              const targetZips = top3.map((s: any) =>
                String(s?.zip ?? "").replace(/[^0-9]/g, "").slice(0, 5)
              );

              // 3) aggregate expected bookings across top 3
              const sum = (arr: number[]) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
              const patientsLow  = sum(top3.map((s: any) => s?.expected_bookings?.p10 ?? 0));
              const patientsHigh = sum(top3.map((s: any) => s?.expected_bookings?.p90 ?? 0));

              // 4) annual revenue range (fallback ARPV = $400 if not provided by API)
              const ARPV =
                Number((results as any)?.avg_revenue_per_patient) || 400;
              const annualLow  = patientsLow  * ARPV * 12;
              const annualHigh = patientsHigh * ARPV * 12;
              const fmtUSD = (n: number) =>
                n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

              return (
                <div className="mt-4">
                  <ExpansionHero
                    targetZips={targetZips}
                    patientsLow={patientsLow}
                    patientsHigh={patientsHigh}
                    revLow={fmtUSD(annualLow)}
                    revHigh={fmtUSD(annualHigh)}
                    onDiscover={() => {}}
                  />
                </div>
              );
            })()}
          {/* Procedure Filter Dropdown */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Scope</h3>
                <p className="text-sm text-gray-600 dark:text-white/70">Filter results by specific procedure type</p>
              </div>
              <select 
                value={selectedProcedure}
                onChange={(e) => handleProcedureChange(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 px-4 py-2 text-gray-900 dark:text-white"
              >
                <option value="">All Procedures</option>
                {availableProcedures.map((proc) => (
                  <option key={proc.name} value={proc.name}>
                    {proc.name} ({proc.count} patients)
                  </option>
                ))}
              </select>
            </div>
            {selectedProcedure && (
              <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
                Showing results filtered for {selectedProcedure} patients only
              </div>
            )}
          </div>

            {/* ZIP Cards */}
            <div id="zip-cards-section">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">Top Target Areas</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {getSixSegments(results.top_segments).map((segment: any, index: number) => (
                  <div key={segment.zip} className="rounded-2xl border border-gray-200 dark:border-white/12 bg-white dark:bg-white/[0.03] p-8 hover:shadow-2xl dark:hover:bg-white/[0.06] transition-all duration-300 backdrop-blur-2xl">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-sm font-medium text-gray-500 dark:text-white/60">#{index + 1}</span>
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                            ZIP {String(segment.zip).replace(/[^0-9]/g, '').substring(0, 5)}
                          </h4>
                        </div>
                        <CohortPill label={segment.cohort} />
                      </div>
                      <MatchBadge score={segment.match_score} />
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {segment?.distance_miles != null ? Number(segment.distance_miles).toFixed(1) : '—'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-white/60">miles away</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {segment?.competitors ?? '—'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-white/60">competitors</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gray-50 dark:bg-white/[0.03] p-4 mb-6 border border-gray-100 dark:border-white/10">
                      <div className="text-xs font-semibold text-gray-700 dark:text-white/70 mb-3 uppercase tracking-wide">Expected Monthly Bookings</div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-white/60">Low: {segment.expected_bookings?.p10 ?? '—'}</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-500/20 rounded-lg">
                          Typical: {segment.expected_bookings?.p50 ?? '—'}
                        </span>
                        <span className="text-gray-600 dark:text-white/60">High: {segment.expected_bookings?.p90 ?? '—'}</span>
                      </div>
                    </div>

                    {/* Emergency debug logging for strategic insights */}
                    {(() => {
                      console.log('Full segment data:', segment);
                      console.log('Strategic insights check:', segment?.strategic_insights);
                      console.log('Keys in segment:', Object.keys(segment || {}));
                      return null;
                    })()}

                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">STRATEGIC INSIGHTS</h3>
                      {/* Try multiple possible data paths, expanded */}
                      {(segment.strategic_insights || segment.strategicInsights || segment.insights || segment.strategic_analysis || segment.analysis_insights) ? (
                        <div className="space-y-3">
                          {(segment.strategic_insights || segment.strategicInsights || segment.insights || segment.strategic_analysis || segment.analysis_insights).map((insight: string, idx: number) => (
                            <div key={idx} className={`border-l-4 pl-4 py-3 rounded-r ${
                              idx === 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                              idx === 1 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                              'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            }`}>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                {insight}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-red-500 text-sm">
                          DEBUG: Available properties: {Object.keys(segment || {}).join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      className="w-full font-semibold py-3 px-6 rounded-xl text-white transition-all hover:shadow-lg"
                      style={{ background: BRAND_GRADIENT }}
                      onClick={() => setCampaignModal({
                        open: true,
                        zipCode: segment.zip,
                        cohort: segment.cohort,
                        reasons: [
                          `${segment.competitors === 0 ? 'Virgin territory' : 'Competitive market'} - ${segment.zip} represents ${segment.rank === 1 ? 'primary' : 'secondary'} expansion opportunity`,
                          `${segment.distance < 5 ? 'Hyperlocal advantage' : 'Regional positioning'} - ${segment.distance} miles enables ${segment.cohort.toLowerCase()} demographic targeting`,
                          `Revenue optimization through ${segment.cohort.toLowerCase()} market positioning with ${segment.expected_bookings?.typical || 3} monthly patient acquisition target`
                        ],
                        competitors: segment.competitors,
                        matchScore: segment.match_score,
                        procedure: selectedProcedure || null
                      })}
                    >
                      Generate Campaign Intelligence
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <FacebookCampaignModal
          isOpen={campaignModal.open}
          onClose={() => setCampaignModal({ open: false })}
          zipCode={campaignModal.zipCode || ''}
          cohort={campaignModal.cohort || ''}
          reasons={campaignModal.reasons || []}
          competitors={campaignModal.competitors || 0}
          matchScore={campaignModal.matchScore || 0}
          procedure={campaignModal.procedure}
        />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#0B0F1A] dark:to-[#0B0F1A] dark:bg-[radial-gradient(60%_70%_at_10%_0%,rgba(99,102,241,0.15),transparent_60%),radial-gradient(50%_60%_at_100%_0%,rgba(56,189,248,0.15),transparent_60%),radial-gradient(40%_50%_at_0%_100%,rgba(16,185,129,0.12),transparent_60%)] min-h-screen">
      {/* Header */}
      <header className="px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SquareLogo />
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: BRAND_GRADIENT }}
              >
                Audience Mirror
              </h1>
              <p className="text-sm text-gray-600 dark:text-white/60">Premium data-driven intelligence</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center transition-all"
            aria-label="Toggle theme"
          >
            <Sun className={`h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
            <Moon className={`absolute h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Find more patients like your{" "}
          <span 
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >
            best ones
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-white/70 max-w-2xl mx-auto">
          ZIP-level intelligence that shows you exactly where your next best patients are hiding — no PII, just data-driven clarity.
        </p>
      </section>

      {/* Upload Form */}
      <section className="mx-auto max-w-4xl rounded-3xl bg-gray-100/70 dark:bg-white/[0.05] p-10 border border-gray-200 dark:border-white/10 shadow-inner backdrop-blur-2xl mb-16">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Upload Your Patient Data</h2>
        
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
            <label htmlFor="patients" className="font-medium text-gray-700 dark:text-white">
              Patient Data (CSV)
            </label>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
              Upload your patient list with ZIP code, procedure type, and revenue so we can analyze trends.
            </p>
            <input
              id="patients"
              type="file"
              accept=".csv"
              onChange={(e) => setPatientsFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div className="mt-3 flex gap-3">
              <label htmlFor="patients" className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer text-center">
                Upload CSV
              </label>
              <button 
                onClick={downloadPatientTemplate}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70 text-center"
              >
                Download Template
              </button>
            </div>
            {patientsFile && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-700 dark:text-green-300 text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {patientsFile.name} uploaded successfully
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
            <label htmlFor="competitors" className="font-medium text-gray-700 dark:text-white">
              Competitors (Optional)
            </label>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
              Upload a competitor list to see how your practice stacks up in the local market.
            </p>
            <input
              id="competitors"
              type="file"
              accept=".csv"
              onChange={(e) => setCompetitorsFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div className="mt-3">
              <label htmlFor="competitors" className="block w-full rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer text-center">
                Upload CSV
              </label>
            </div>
            {competitorsFile && (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center text-green-700 dark:text-green-300 text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {competitorsFile.name} uploaded successfully
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
            <label htmlFor="practice-zip" className="font-medium text-gray-700 dark:text-white">Practice ZIP Code</label>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">We'll anchor all analysis around your practice location so insights are personalized to you.</p>
            <input 
              id="practice-zip"
              type="text" 
              placeholder="10021" 
              value={practiceZip}
              onChange={(e) => setPracticeZip(e.target.value)}
              maxLength={5}
              className="mt-3 block w-full rounded-md border border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
            />
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm backdrop-blur-xl">
            <label className="font-medium text-gray-700 dark:text-white">Campaign Focus</label>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">Pick the types of patients or procedures you want to prioritize in your growth plan.</p>
            <div className="mt-3 flex gap-4">
              <button 
                onClick={() => setFocus('non_inv')}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition ${
                  focus === 'non_inv'
                    ? 'border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70'
                }`}
              >
                Non-Invasive
              </button>
              <button 
                onClick={() => setFocus('surgical')}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition ${
                  focus === 'surgical'
                    ? 'border-blue-500/60 bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                    : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5 text-gray-600 dark:text-white/70'
                }`}
              >
                Surgical
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-10 text-center">
          <button 
            onClick={handleAnalyze}
            disabled={loading || !patientsFile || !practiceZip}
            aria-busy={loading}
            className="rounded-lg px-8 py-3 text-lg font-semibold text-white shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: BRAND_GRADIENT }}
          >
            {loading ? 'Analyzing...' : 'Analyze My Data'}
          </button>
        </div>
      </section>

      {/* --- Market Intelligence summary (shows the button) --- */}

      {/* How It Works */}
      <section className="py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">How It Works</h2>
            <p className="mt-3 text-lg text-gray-600 dark:text-white/70">Three simple steps to uncover your next best patients with clarity and confidence.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              title="Upload Your File"
              desc="Drop in a CSV with ZIP codes, treatments, and revenue. No sensitive info needed — just the basics for analysis."
            />
            <StepCard
              number="2"
              title="AI Uncovers Hotspots"
              desc="Our algorithm pinpoints the ZIP codes with the highest growth potential by blending demographics, competition, and patient history."
            />
            <StepCard
              number="3"
              title="Get Your Growth Playbook"
              desc="Receive a clear roadmap: where to market, pricing strategy, and projected patient volume for smarter decisions."
            />
          </div>
        </div>
      </section>
    </div>
  );
}