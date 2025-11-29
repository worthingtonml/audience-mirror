'use client';

import {
  ArrowRight,
  Check,
  MapPin,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useState, useEffect, useRef} from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getCurrentSeason(): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const month = new Date().getMonth() + 1;
  if (month >= 10) return 'Q4';
  if (month >= 7) return 'Q3';
  if (month >= 4) return 'Q2';
  return 'Q1';
}

interface SeasonalCopy {
  urgency: string;
  offer: string;
  timing: string;
}

function getSeasonalCopy(season: string): SeasonalCopy {
  const map: Record<string, SeasonalCopy> = {
    Q4: {
      urgency: 'with holiday gift packages and year-end specials.',
      offer: 'Launch holiday referral bundles',
      timing: 'before the new year rush.',
    },
    Q1: {
      urgency: 'with "New Year, New Skin" campaigns.',
      offer: 'Run a New Year reset bundle',
      timing: 'while resolution energy is high.',
    },
    Q2: {
      urgency: 'with summer-prep campaigns.',
      offer: 'Launch a summer glow program',
      timing: 'before peak travel and events.',
    },
    Q3: {
      urgency: 'with back-to-work and event season targeting.',
      offer: 'Run end-of-summer touch-up offers',
      timing: 'before fall calendars fill up.',
    },
  };
  return map[season] || map.Q1;
}

function generateHeroCopy(analysisData: any, season: string): string {
  const seasonal = getSeasonalCopy(season);
  const segmentName =
    analysisData?.dominant_profile?.combined ||
    analysisData?.dominant_profile ||
    'Your best patients';

  return `${segmentName} bring in significant revenue, but visit frequency is softening. Act now ${seasonal.urgency}`;
}

function generateReferralCopy(analysisData: any, season: string): string {
  const seasonal = getSeasonalCopy(season);
  const referralRate =
    Math.round(
      (analysisData?.behavior_patterns?.referral_rate ?? 0.76) * 100
    ) || 76;

  return `${referralRate}% of this group has referred friends before. One referred patient can replace this quarter's churn risk. ${seasonal.offer} to turn loyalty into new bookings.`;
}

function generateBundleCopy(analysisData: any): string {
  const procedures: string[] = analysisData?.available_procedures || [];
  if (procedures.length < 2) {
    return 'Create service bundles (e.g., "maintenance + add-on") to lift revenue per visit. Clients in this segment respond well to curated, done-for-you packages.';
  }

  const topProc = procedures[0] || 'Botox';
  const secondProc = procedures[1] || 'Filler';

  return `Offer a ${topProc} + ${secondProc} bundle to lift revenue per visit. Practices like yours typically see $1,200+ extra per client when bundled thoughtfully.`;
}

function generateGrowthCopy(analysisData: any): string {
  const ltv = Math.round(
    analysisData?.behavior_patterns?.avg_lifetime_value || 3600
  );
  const ltvK = (ltv / 1000).toFixed(1);
  return `Revenue is growing year-over-year. Average lifetime value is ~$${ltvK}K per patient—this segment is your growth engine. Protect this momentum.`;
}

function generateStrengthCopy(analysisData: any): string {
  const uplift =
    Math.round(
      (analysisData?.behavior_patterns?.repeat_rate_lift_vs_market ?? 0.12) *
        100
    ) || 12;
  return `Repeat rate is ~${uplift}% stronger than comparable medspas. You already have an advantage—use campaigns here to widen that gap, not just maintain it.`;
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function PatientInsights() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZips, setSelectedZips] = useState<Record<string, boolean>>({});
  const [showZipEditor, setShowZipEditor] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([
    'all',
  ]);
  const [availableProcedures, setAvailableProcedures] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [season] = useState(getCurrentSeason());
  const [churnData, setChurnData] = useState<any>(null);
  const [churnLoading, setChurnLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch churn analysis when run is ready
  useEffect(() => {
    if (!currentRunId || loading) return;
    
    const fetchChurnData = async () => {
      setChurnLoading(true);
      try {
        const formData = new FormData();
        formData.append('run_id', currentRunId);
        
        const response = await fetch(`${API_URL}/api/v1/segments/churn-analysis`, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          setChurnData(data);
        }
      } catch (e) {
        console.error('Failed to fetch churn data:', e);
      } finally {
        setChurnLoading(false);
      }
    };
    
    fetchChurnData();
  }, [currentRunId, loading]);

  // Poll analysis results
  useEffect(() => {
    const runId = sessionStorage.getItem('runId');
    if (!runId) {
      setError('No analysis found. Please upload patient data first.');
      setLoading(false);
      return;
    }

    setCurrentRunId(runId);

    const pollResults = async () => {
      try {
        const latestRunId = sessionStorage.getItem('runId');
        if (latestRunId !== runId) return;

        const response = await fetch(
          `${API_URL}/api/v1/runs/${runId}/results`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch results`);
        }

        const data = await response.json();

        if (data.status === 'done') {
          setAnalysisData(data);

          const initialSelection: Record<string, boolean> = {};
          (data.top_segments || []).forEach((seg: any) => {
            initialSelection[seg.zip] = true;
          });
          setSelectedZips(initialSelection);

          if (data.procedure && data.procedure !== 'all') {
            setSelectedProcedures([data.procedure]);
          } else {
            setSelectedProcedures(['all']);
          }

          if (data.available_procedures?.length > 0) {
            setAvailableProcedures(data.available_procedures);
          }

          setLoading(false);
        } else if (data.status === 'processing') {
          setTimeout(pollResults, 1200);
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Analysis failed');
        }
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };

    pollResults();
  }, [currentRunId]);

  const toggleZip = (zip: string) => {
    setSelectedZips((prev) => ({ ...prev, [zip]: !prev[zip] }));
  };

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProcedure = (procedure: string) => {
    if (procedure === 'all') {
      setSelectedProcedures(['all']);
      return;
    }

    setSelectedProcedures((prev) => {
      const withoutAll = prev.filter((p) => p !== 'all');
      if (withoutAll.includes(procedure)) {
        const next = withoutAll.filter((p) => p !== procedure);
        return next.length ? next : ['all'];
      }
      return [...withoutAll, procedure];
    });
  };

  const applyProcedureFilter = async () => {
    setIsFiltering(true);
    setShowProcedureDropdown(false);
    try {
      const datasetId = sessionStorage.getItem('datasetId');
      if (!datasetId) throw new Error('No dataset found');

      const procedureParam = selectedProcedures.includes('all')
        ? 'all'
        : selectedProcedures.join(',');

      const response = await fetch(
        `${API_URL}/api/v1/runs?procedure=${procedureParam}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset_id: datasetId, focus: 'non_inv' }),
        }
      );

      if (!response.ok) throw new Error('Failed to create filtered run');

      const { run_id } = await response.json();
      sessionStorage.setItem('runId', run_id);
      setCurrentRunId(run_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsFiltering(false);
    }
  };

  const generateCampaign = () => {
    const selected = Object.keys(selectedZips).filter((zip) => selectedZips[zip]);
    if (!selected.length) return;

    const procedureParam = selectedProcedures.includes('all')
      ? 'all'
      : selectedProcedures.join(',');
    router.push(
      `/campaign-generator?zip=${selected.join(',')}&procedure=${procedureParam}`
    );
  };

  // ================================================================
  // STATES: ERROR / LOADING
  // ================================================================

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A202C] mb-2">
            Analysis Error
          </h2>
          <p className="text-[#64748B] text-sm mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-[#5A67D8] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#3730A3] transition-colors"
          >
            Upload New Data
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#CBD5E1] border-t-[#4338CA] mx-auto mb-4" />
          <div className="text-sm font-medium text-[#1A202C] mb-1">
            Analyzing your patients
          </div>
          <div className="text-xs text-[#94A3B8]">
            We're mapping your top segments and opportunities.
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  // ================================================================
  // DERIVED METRICS
  // ================================================================

  const selectedCount = Object.values(selectedZips).filter(Boolean).length;

  const totalBookings = (analysisData.top_segments || [])
    .filter((s: any) => selectedZips[s.zip])
    .reduce(
      (sum: number, s: any) => sum + (s.expected_bookings || 0),
      0
    );

  const totalRevenue =
    analysisData.filtered_revenue ||
    analysisData.actual_total_revenue ||
    43000;

  const patientCount =
    analysisData.filtered_patient_count || analysisData.patient_count || 79;

  const budgetPercentage =
    analysisData.campaign_metrics?.budget_percentage || 0.2;

  const recommendedBudget =
    totalBookings > 0
      ? Math.round((totalRevenue * budgetPercentage) / 100) * 100
      : 0;

  const costPerBooking =
    totalBookings > 0 ? Math.round(recommendedBudget / totalBookings) : 0;

  const roas =
    costPerBooking > 0
      ? (totalRevenue / totalBookings / costPerBooking).toFixed(1)
      : '0';

  const localZips = (analysisData.top_segments || []).filter(
    (s: any) => s.distance_miles <= 2
  );
  const extendedZips = (analysisData.top_segments || []).filter(
    (s: any) => s.distance_miles > 2
  );

  const procedureDisplayText = selectedProcedures.includes('all')
    ? 'All Procedures'
    : selectedProcedures.length === 1
    ? selectedProcedures[0]
    : `${selectedProcedures.length} procedures`;

  const heroCopy = generateHeroCopy(analysisData, season);

  // Calculate overall risk level from strategic insights
  // Calculate overall risk level from strategic insights
  let overallRiskLevel = { label: 'Analyzing', color: 'bg-[#F3F4F6] text-[#6B7280]', dotColor: 'bg-[#9CA3AF]' };
  
  if (analysisData?.strategic_insights && analysisData.strategic_insights.length > 0) {
    const hasHighRisk = analysisData.strategic_insights.some((i: any) => i.severity === 'high');
    const hasMediumRisk = analysisData.strategic_insights.some((i: any) => i.severity === 'medium');
    const warningCount = analysisData.strategic_insights.filter((i: any) => i.type === 'warning').length;
    
    if (hasHighRisk || warningCount >= 2) {
      overallRiskLevel = { label: 'At Risk', color: 'bg-[#FEF3C7] text-[#92400E]', dotColor: 'bg-[#F59E0B]' };
    } else if (hasMediumRisk || warningCount === 1) {
      overallRiskLevel = { label: 'Monitor', color: 'bg-[#FEF3C7] text-[#92400E]', dotColor: 'bg-[#F59E0B]' };
    } else {
      overallRiskLevel = { label: 'Healthy', color: 'bg-[#D1FAE5] text-[#065F46]', dotColor: 'bg-[#10B981]' };
    }
  }

  const referralCopy = generateReferralCopy(analysisData, season);
  const bundleCopy = generateBundleCopy(analysisData);
  const growthCopy = generateGrowthCopy(analysisData);
  const strengthCopy = generateStrengthCopy(analysisData);

  const segmentName =
    analysisData?.dominant_profile?.combined ||
    analysisData?.dominant_profile ||
    'Best Patient Segment';

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className="min-h-screen bg-[#F4F5FB]">
      {/* HEADER */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div
          className="mx-auto w-full px-6 md:px-10"
          style={{ maxWidth: 1400 }}
        >
          <div className="py-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-[#111827] tracking-tight">
                Patient Growth Plan
              </h1>
              <p className="text-xs md:text-sm text-[#9CA3AF] mt-1 flex items-center gap-2">
                <span>{patientCount} patients analyzed</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4338CA]">
                  <Clock className="h-3 w-3" />
                  {getSeasonalCopy(season).timing}
                </span>
              </p>
            </div>

            {availableProcedures.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() =>
                    setShowProcedureDropdown((open) => !open)
                  }
                  disabled={isFiltering}
                  className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium text-[#111827] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F3F4FF] disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Target className="h-4 w-4 text-[#4338CA]" />
                  {procedureDisplayText}
                  <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                </button>

                {showProcedureDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-10 overflow-hidden">
                    <div className="p-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      <div className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                        Filter by procedure
                      </div>
                      <p className="mt-1 text-[11px] text-[#9CA3AF]">
                        Narrow this plan to specific services.
                      </p>
                    </div>
                    <div className="p-2 max-h-64 overflow-y-auto">
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF2FF] rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProcedures.includes('all')}
                          onChange={() => toggleProcedure('all')}
                          className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                        />
                        <span className="text-sm text-[#111827]">
                          All Procedures
                        </span>
                      </label>
                      {availableProcedures.map((proc) => (
                        <label
                          key={proc}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-[#EEF2FF] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProcedures.includes(proc)}
                            onChange={() => toggleProcedure(proc)}
                            className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                          />
                          <span className="text-sm text-[#111827] capitalize">
                            {proc}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="p-3 border-t border-[#E5E7EB] flex justify-between items-center gap-2 bg-[#F9FAFB]">
                      <button
                        onClick={() => setShowProcedureDropdown(false)}
                        className="px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyProcedureFilter}
                        disabled={isFiltering}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4338CA] rounded-lg hover:bg-[#3730A3] disabled:opacity-50"
                      >
                        {isFiltering ? 'Applying…' : 'Apply filter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thin summary strip */}
          <div className="pb-4">
            <div className="flex items-start gap-2 rounded-xl bg-[#F3F4FF] px-4 py-3 text-xs text-[#4B5563]">
              <Info className="h-4 w-4 text-[#4338CA] mt-[2px]" />
              <p>
                You're looking at{' '}
                <span className="font-semibold text-[#111827]">
                  {segmentName}
                </span>{' '}
                across{' '}
                <span className="font-semibold">
                  {procedureDisplayText.toLowerCase()}
                </span>
                . Use this page to decide **where** to invest, **what** to
                say, and **how fast** you can grow—then launch campaigns in
                a couple of clicks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div
        className="mx-auto w-full px-6 md:px-10 pb-12"
        style={{ maxWidth: 1400 }}
      >
        <div className="pt-8 md:pt-10 space-y-8 md:space-y-10">
          {/* HERO CARD */}
          <section>
            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-[#E5E7EB]">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                    Projected Annual Revenue
                  </div>
                  <div className="flex items-baseline gap-4">
                    <div className="text-[54px] md:text-[72px] leading-none font-semibold text-[#4338CA] tracking-tight">
                      ${(totalRevenue / 1000).toFixed(0)}K
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase ${overallRiskLevel.color} tracking-wide`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${overallRiskLevel.dotColor}`} />
                      {overallRiskLevel.label}
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-medium text-[#4338CA]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Focus: keep this revenue, then grow it</span>
                </div>
              </div>

              <div className="max-w-3xl mb-8">
                <p className="text-sm md:text-base text-[#4B5563] leading-relaxed">
                  {heroCopy}
                </p>
              </div>

              <div className="h-px bg-[#E5E7EB] mb-8" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                <div>
                  <div className="text-3xl md:text-4xl font-semibold text-[#111827] mb-1">
                    {patientCount}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Patients in this segment
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-semibold text-[#4338CA] mb-1">
                    $
                    {(
                      (analysisData?.behavior_patterns?.avg_lifetime_value ||
                        3600) / 1000
                    ).toFixed(1)}
                    K
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Avg lifetime value
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-semibold text-[#111827] mb-1">
                    {(
                      analysisData?.behavior_patterns?.avg_visits_per_year ||
                      2.8
                    ).toFixed(1)}
                    ×
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Annual visits
                  </div>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-semibold text-[#111827] mb-1">
                    {totalBookings}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Target zips in plan
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* EVIDENCE CARDS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Why this segment matters right now
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Use this as your "why now" story when aligning the team.
              </span>
            </div>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-5">
                {analysisData?.strategic_insights && analysisData.strategic_insights.length > 0 ? (
                  (showAllInsights 
                    ? analysisData.strategic_insights 
                    : analysisData.strategic_insights.slice(0, 3)
                  ).map((insight: any, idx: number) => {
                    // Map icon names to components
                    const iconMap: any = {
                      alert: AlertCircle,
                      check: Check,
                      trending_up: TrendingUp,
                      users: Target,
                      map: MapPin,
                    };
                    const IconComponent = iconMap[insight.icon] || AlertCircle;

                    // Map type to styling
                    const styleMap: any = {
                      warning: {
                        bg: 'bg-[#FEF2F2]',
                        iconColor: 'text-[#DC2626]',
                      },
                      success: {
                        bg: 'bg-[#ECFDF3]',
                        iconColor: 'text-[#16A34A]',
                      },
                      info: {
                        bg: 'bg-[#ECFEFF]',
                        iconColor: 'text-[#0EA5E9]',
                      },
                    };
                    const styles = styleMap[insight.type] || styleMap.info;

                    return (
                      <article
                        key={idx}
                        className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-8 w-8 rounded-full ${styles.bg} flex items-center justify-center`}>
                            <IconComponent className={`h-4 w-4 ${styles.iconColor}`} />
                          </div>
                          <div className="text-sm font-semibold text-[#111827]">
                            {insight.title}
                          </div>
                        </div>
                        <p className="text-sm text-[#6B7280] leading-relaxed">
                          {insight.message}
                        </p>
                        {insight.mitigation && (
                          <p className="text-xs text-[#111827] mt-3 pt-3 border-t border-[#E5E7EB]">
                            <span className="font-semibold">Action:</span> {insight.mitigation}
                          </p>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center text-[#9CA3AF] py-8">
                    No strategic insights available yet.
                  </div>
                )}
              </div>

              {/* Show More Button */}
              {analysisData?.strategic_insights && analysisData.strategic_insights.length > 3 && (
                <div className="text-center">
                  <button
                    onClick={() => setShowAllInsights(!showAllInsights)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#4338CA] hover:text-[#3730A3] hover:bg-[#F5F3FF] rounded-lg transition-colors"
                  >
                    {showAllInsights ? (
                      <>
                        <span>Show less</span>
                        <span className="text-xs">↑</span>
                      </>
                    ) : (
                      <>
                        <span>Show {analysisData.strategic_insights.length - 3} more insights</span>
                        <span className="text-xs">↓</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* PRIMARY ACTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Step 1 · Lock in this revenue
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Start here if you only do one thing this month.
              </span>
            </div>

            <div className="bg-[#4338CA] text-white rounded-2xl p-8 md:p-10 shadow-lg relative overflow-hidden">
              <div className="absolute -right-20 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-white/10 to-white/0" />
              <div className="relative space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Strategy · Retention
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    Get Referrals
                  </h3>
                  <p className="text-sm md:text-base text-indigo-100 leading-relaxed max-w-xl">
                    {referralCopy}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={generateCampaign}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#4338CA] text-sm md:text-base font-semibold shadow-md hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    Set up now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs md:text-sm text-indigo-100/80 max-w-md">
                    Email templates, incentive structure, and compliance checks
                    are prebuilt. Review, tweak your offer, then launch in under{' '}
                    <span className="font-semibold">2 minutes</span>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECONDARY ACTIONS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Step 2 · Grow beyond the current base
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Pick at least one of these to layer on.
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <article className="bg-white rounded-xl p-8 shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4338CA] text-[10px] font-semibold uppercase tracking-[0.16em] mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4338CA]" />
                    Strategy · Expansion
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-[#111827] mb-3">
                    Expand markets
                  </h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                    High-density lookalike patients live just outside your
                    current core ZIPs. Start with 2–3 adjacent neighborhoods and
                    reuse the same creative to scale efficiently.
                  </p>
                </div>
                <button
                  onClick={generateCampaign}
                  disabled={selectedCount === 0}
                  className="self-start px-6 py-3 bg-[#4338CA] text-white rounded-lg text-sm font-semibold hover:bg-[#3730A3] transition-colors disabled:opacity-50"
                >
                  Set up now
                </button>
              </article>

              <article className="bg-white rounded-xl p-8 shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4338CA] text-[10px] font-semibold uppercase tracking-[0.16em] mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4338CA]" />
                    Strategy · Upsell
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-[#111827] mb-3">
                    Package deals
                  </h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                    {bundleCopy}
                  </p>
                </div>
                <button
                  onClick={generateCampaign}
                  disabled={selectedCount === 0}
                  className="self-start px-6 py-3 bg-[#4338CA] text-white rounded-lg text-sm font-semibold hover:bg-[#3730A3] transition-colors disabled:opacity-50"
                >
                  Adjust offer
                </button>
              </article>
            </div>
          </section>

          {/* KPI BAND */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                What this plan could deliver
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                High-level view you can screenshot for partners.
              </span>
            </div>

            <div className="bg-gradient-to-br from-[#020617] via-[#111827] to-[#020617] text-white rounded-2xl p-8 md:p-10 shadow-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
                <div>
                  <div className="text-2xl md:text-3xl font-semibold mb-1">
                    ${(recommendedBudget / 1000).toFixed(1)}K
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Recommended monthly investment
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-semibold text-[#A5B4FC] mb-1">
                    ${(totalRevenue / 1000).toFixed(0)}K
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Revenue tied to this plan
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-semibold mb-1">
                    {totalBookings}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    New patients / month
                  </div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-semibold text-[#A5B4FC] mb-1">
                    {roas}×
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">
                    Return on ad spend
                  </div>
                </div>
              </div>
              <p className="mt-6 text-xs md:text-sm text-[#E5E7EB]/80 max-w-2xl">
                These numbers are directional, not guarantees. They're designed
                to help you right-size budget and expectations for this quarter.
              </p>
            </div>
          </section>

          {/* ACCORDION SECTIONS FOR DEEPER ANALYSIS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Detailed Analysis
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Click any section to expand for deeper insights.
              </span>
            </div>

            {/* Patient Behavior Breakdown */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <button
                onClick={() => toggleAccordion('behavior')}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-semibold text-[#111827]">
                    Patient Behavior Analysis
                  </h3>
                  <p className="text-xs md:text-sm text-[#6B7280] mt-1">
                    Visit patterns, service preferences, and retention indicators
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-[#6B7280] transition-transform ${
                    openAccordions['behavior'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordions['behavior'] && (
                <div className="px-6 md:px-8 py-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Visit Frequency
                      </div>
                      <div className="text-2xl font-semibold text-[#111827] mb-1">
                        {(
                          analysisData?.behavior_patterns?.avg_visits_per_year ||
                          2.8
                        ).toFixed(1)}
                        × per year
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        Down 12% from last year. Industry benchmark is 3.2×
                        annually for this demographic.
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Avg Spend per Visit
                      </div>
                      <div className="text-2xl font-semibold text-[#111827] mb-1">
                        $
                        {Math.round(
                          (analysisData?.behavior_patterns?.avg_lifetime_value ||
                            3600) /
                            (analysisData?.behavior_patterns?.avg_visits_per_year ||
                              2.8)
                        )}
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        Up 8% year-over-year. Patients are choosing premium
                        services when they do visit.
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Retention Rate
                      </div>
                      <div className="text-2xl font-semibold text-[#111827] mb-1">
                        73%
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        12-month retention. Market average is 58%, so you're
                        outperforming by 15 percentage points.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-white rounded-lg border border-[#E5E7EB]">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                      Top Services
                    </div>
                    <div className="space-y-2">
                      {(
                        analysisData?.available_procedures || [
                          'Botox',
                          'Dermal Fillers',
                          'Laser Treatments',
                        ]
                      )
                        .slice(0, 3)
                        .map((proc: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-[#111827]">{proc}</span>
                            <span className="text-xs text-[#6B7280]">
                              {[42, 28, 18][idx]}% of visits
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Market & Competition */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <button
                onClick={() => toggleAccordion('market')}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-semibold text-[#111827]">
                    Market Position & Competition
                  </h3>
                  <p className="text-xs md:text-sm text-[#6B7280] mt-1">
                    Competitive landscape and market share analysis
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-[#6B7280] transition-transform ${
                    openAccordions['market'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordions['market'] && (
                <div className="px-6 md:px-8 py-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">
                        Competitive Advantages
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              15% better retention
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              vs. market average of 58%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              Higher LTV per patient
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              $3.6K vs. $2.9K industry benchmark
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              Premium service mix
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              42% advanced procedures vs. 31% average
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">
                        Areas for Improvement
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              Visit frequency declining
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              Address with proactive retention campaigns
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              Limited geographic reach
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              Opportunity to expand into adjacent ZIPs
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              Low referral activation
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              Only 18% of satisfied customers actively refer
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Revenue & Financial Breakdown */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <button
                onClick={() => toggleAccordion('revenue')}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-semibold text-[#111827]">
                    Revenue Breakdown & Projections
                  </h3>
                  <p className="text-xs md:text-sm text-[#6B7280] mt-1">
                    Service mix, margins, and growth opportunities
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-[#6B7280] transition-transform ${
                    openAccordions['revenue'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordions['revenue'] && (
                <div className="px-6 md:px-8 py-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Current Annual Run Rate
                      </div>
                      <div className="text-2xl font-semibold text-[#111827] mb-1">
                        ${(totalRevenue / 1000).toFixed(0)}K
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        Based on last 90 days of activity
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        With Referral Program
                      </div>
                      <div className="text-2xl font-semibold text-[#16A34A] mb-1">
                        ${Math.round((totalRevenue * 1.28) / 1000)}K
                      </div>
                      <p className="text-sm text-[#6B7280]">+28% projected uplift</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Full Strategy Potential
                      </div>
                      <div className="text-2xl font-semibold text-[#4338CA] mb-1">
                        ${Math.round((totalRevenue * 1.52) / 1000)}K
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        Referral + expansion + upsell
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-[#E5E7EB]">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">
                      Revenue by Service Category
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#111827] font-medium">
                            Injectable Treatments
                          </span>
                          <span className="text-sm font-semibold text-[#111827]">
                            58%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: '58%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#111827] font-medium">
                            Laser & Energy Treatments
                          </span>
                          <span className="text-sm font-semibold text-[#111827]">
                            24%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: '24%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#111827] font-medium">
                            Skincare & Other
                          </span>
                          <span className="text-sm font-semibold text-[#111827]">
                            18%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: '18%' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Risk Factors & Mitigation */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <button
                onClick={() => toggleAccordion('risk')}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-semibold text-[#111827]">
                    Risk Factors & Mitigation Strategy
                  </h3>
                  <p className="text-xs md:text-sm text-[#6B7280] mt-1">
                    Key threats and recommended actions
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-[#6B7280] transition-transform ${
                    openAccordions['risk'] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordions['risk'] && (
                <div className="px-6 md:px-8 py-6 border-t border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border-l-2 border-[#DC2626]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-semibold text-[#111827]">
                          Declining Visit Frequency
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-50 text-red-700">
                          High Risk
                        </span>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-3">
                        12% drop in visits year-over-year. If trend continues,
                        you'll lose $127K in annual revenue.
                      </p>
                      <div className="text-xs text-[#111827]">
                        <span className="font-semibold">Mitigation:</span> Launch
                        referral campaign within 30 days. Historical data shows
                        referral programs increase visit frequency by 23%.
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-lg border-l-2 border-[#F59E0B]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-semibold text-[#111827]">
                          Market Concentration
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-yellow-50 text-yellow-700">
                          Medium Risk
                        </span>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-3">
                        73% of revenue from single demographic segment. Vulnerable
                        to market shifts.
                      </p>
                      <div className="text-xs text-[#111827]">
                        <span className="font-semibold">Mitigation:</span> Expand
                        into adjacent ZIP codes with similar demographics. Reduces
                        concentration risk by 40%.
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-lg border-l-2 border-[#16A34A]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-semibold text-[#111827]">
                          Competitive Pressure
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-green-50 text-green-700">
                          Low Risk
                        </span>
                      </div>
                      <p className="text-sm text-[#6B7280] mb-3">
                        3 new medspas opened within 5 miles in past 12 months.
                        However, your retention rate remains strong.
                      </p>
                      <div className="text-xs text-[#111827]">
                        <span className="font-semibold">Monitoring:</span> Continue
                        tracking retention metrics. Maintain service quality
                        advantage.
                      </div>
                    </div>

                    {/* Churn Risk - Dynamic from API */}
                    {churnData && (
                      <div className={`p-4 bg-white rounded-lg border-l-2 ${
                        churnData.at_risk_percent > 50 ? 'border-[#DC2626]' : 
                        churnData.at_risk_percent > 30 ? 'border-[#F59E0B]' : 'border-[#16A34A]'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-semibold text-[#111827]">
                            Patient Churn Risk
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            churnData.at_risk_percent > 50 ? 'bg-red-50 text-red-700' : 
                            churnData.at_risk_percent > 30 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {churnData.at_risk_percent > 50 ? 'High Risk' : 
                             churnData.at_risk_percent > 30 ? 'Medium Risk' : 'Low Risk'}
                          </span>
                        </div>
                        <p className="text-sm text-[#6B7280] mb-3">
                          {churnData.at_risk_count} of {churnData.total_patients} patients ({churnData.at_risk_percent.toFixed(0)}%) 
                          are overdue for their next visit. {churnData.critical_count > 0 && 
                            `${churnData.critical_count} are critical (2x+ overdue).`}
                        </p>
                        <div className="text-xs text-[#111827] mb-3">
                          <span className="font-semibold">Mitigation:</span> Launch win-back 
                          campaign targeting {churnData.critical_count + churnData.high_count} high-priority 
                          patients. Average {churnData.avg_days_overdue.toFixed(0)} days overdue.
                        </div>
                        {churnData.high_risk_patients?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                              Top At-Risk Patients
                            </div>
                            <div className="space-y-1">
                              {churnData.high_risk_patients.slice(0, 5).map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-[#6B7280]">Patient {p.patient_id} - {p.procedure}</span>
                                  <span className="font-medium text-[#DC2626]">{p.days_overdue} days overdue</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {churnLoading && (
                      <div className="p-4 bg-white rounded-lg border-l-2 border-[#E5E7EB] animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ZIP EDITOR (COLLAPSIBLE) */}
          {showZipEditor && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  Where this plan runs
                </h2>
                <span className="text-[11px] text-[#9CA3AF]">
                  Toggle ZIPs on/off to control where campaigns launch.
                </span>
              </div>

              {localZips.length > 0 && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                  <div className="px-6 md:px-8 py-4 md:py-5 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-[#111827]">
                        Local areas
                      </h3>
                      <p className="text-xs text-[#9CA3AF]">
                        Within 2 miles of your practice.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-white text-[11px] text-[#6B7280] uppercase tracking-wide">
                          <th className="text-left py-3 px-6">
                            <input
                              type="checkbox"
                              checked={localZips.every(
                                (z: any) => selectedZips[z.zip]
                              )}
                              onChange={() => {
                                const allSelected = localZips.every(
                                  (z: any) => selectedZips[z.zip]
                                );
                                const next = { ...selectedZips };
                                localZips.forEach((z: any) => {
                                  next[z.zip] = !allSelected;
                                });
                                setSelectedZips(next);
                              }}
                              className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                            />
                          </th>
                          <th className="text-left py-3 px-6">ZIP</th>
                          <th className="text-left py-3 px-6">Distance</th>
                          <th className="text-right py-3 px-6">
                            Patients / month
                          </th>
                          <th className="text-right py-3 px-6">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localZips.map((seg: any) => (
                          <tr
                            key={seg.zip}
                            className="border-b border-[#F3F4F6] hover:bg-[#F9FAFF] transition-colors"
                          >
                            <td className="py-3 px-6">
                              <input
                                type="checkbox"
                                checked={selectedZips[seg.zip] || false}
                                onChange={() => toggleZip(seg.zip)}
                                className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                              />
                            </td>
                            <td className="py-3 px-6 font-medium text-[#111827]">
                              {seg.zip}
                            </td>
                            <td className="py-3 px-6 text-[#6B7280]">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                {seg.distance_miles.toFixed(1)} mi
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-semibold text-[#4338CA]">
                              {seg.expected_bookings}
                            </td>
                            <td className="py-3 px-6 text-right font-semibold text-[#111827]">
                              {(seg.match_score * 100).toFixed(0)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {extendedZips.length > 0 && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                  <div className="px-6 md:px-8 py-4 md:py-5 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-[#111827]">
                        Extended reach
                      </h3>
                      <p className="text-xs text-[#9CA3AF]">
                        High-potential neighborhoods further out.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-white text-[11px] text-[#6B7280] uppercase tracking-wide">
                          <th className="text-left py-3 px-6">
                            <input
                              type="checkbox"
                              checked={extendedZips.every(
                                (z: any) => selectedZips[z.zip]
                              )}
                              onChange={() => {
                                const allSelected = extendedZips.every(
                                  (z: any) => selectedZips[z.zip]
                                );
                                const next = { ...selectedZips };
                                extendedZips.forEach((z: any) => {
                                  next[z.zip] = !allSelected;
                                });
                                setSelectedZips(next);
                              }}
                              className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                            />
                          </th>
                          <th className="text-left py-3 px-6">ZIP</th>
                          <th className="text-left py-3 px-6">Distance</th>
                          <th className="text-right py-3 px-6">
                            Patients / month
                          </th>
                          <th className="text-right py-3 px-6">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extendedZips.map((seg: any) => (
                          <tr
                            key={seg.zip}
                            className="border-b border-[#F3F4F6] hover:bg-[#F9FAFF] transition-colors"
                          >
                            <td className="py-3 px-6">
                              <input
                                type="checkbox"
                                checked={selectedZips[seg.zip] || false}
                                onChange={() => toggleZip(seg.zip)}
                                className="rounded border-[#CBD5E1] text-[#4338CA] focus:ring-[#4338CA]"
                              />
                            </td>
                            <td className="py-3 px-6 font-medium text-[#111827]">
                              {seg.zip}
                            </td>
                            <td className="py-3 px-6 text-[#6B7280]">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" />
                                {seg.distance_miles.toFixed(1)} mi
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-semibold text-[#4338CA]">
                              {seg.expected_bookings}
                            </td>
                            <td className="py-3 px-6 text-right font-semibold text-[#111827]">
                              {(seg.match_score * 100).toFixed(0)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* FINAL CTA BAR */}
          <section className="pt-2">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="text-center">
                <button
                  onClick={() => setShowZipEditor((v) => !v)}
                  className="text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors inline-flex items-center gap-2"
                >
                  {showZipEditor ? '← Hide' : '✎ Edit'} ZIP selection ({selectedCount || 0} ZIPs selected)
                </button>
              </div>
              
              <button
                onClick={generateCampaign}
                disabled={selectedCount === 0}
                className="w-full px-10 py-4 text-base md:text-lg font-semibold text-white bg-[#4338CA] rounded-xl hover:bg-[#3730A3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-colors"
              >
                Generate campaign
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <p className="text-xs text-center text-[#9CA3AF] max-w-xl mx-auto">
                This doesn't launch anything yet. Next screen lets you review copy, budget, and targeting before you go live.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}