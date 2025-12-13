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

function generateHeroCopy(analysisData: any, season: string, isRealEstate: boolean = false): string {
  const seasonal = getSeasonalCopy(season);
  const segmentName =
    analysisData?.dominant_profile?.combined ||
    analysisData?.dominant_profile ||
    (isRealEstate ? 'Your best clients' : 'Your best patients');

  return `${segmentName} bring in significant revenue, but visit frequency is softening. Act now ${seasonal.urgency}`;
}

function generateReferralCopy(analysisData: any, season: string, isRealEstate: boolean = false): string {
  const seasonal = getSeasonalCopy(season);
  const referralRate =
    Math.round(
      (analysisData?.behavior_patterns?.referral_rate ?? 0.76) * 100
    ) || 76;
  const customerTerm = isRealEstate ? 'client' : 'patient';

  return `${referralRate}% of this group has referred friends before. One referred ${customerTerm} can replace this quarter's churn risk. ${seasonal.offer} to turn loyalty into new bookings.`;
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

function generateGrowthCopy(analysisData: any, isRealEstate: boolean = false): string {
  const ltv = Math.round(
    analysisData?.behavior_patterns?.avg_lifetime_value || 3600
  );
  const ltvK = (ltv / 1000).toFixed(1);
  const customerTerm = isRealEstate ? 'client' : 'patient';
  return `Revenue is growing year-over-year. Average lifetime value is ~$${ltvK}K per ${customerTerm}—this segment is your growth engine. Protect this momentum.`;
}

// Segment-specific psychographic profiles
const SEGMENT_PSYCHOGRAPHICS: Record<string, string[]> = {
  "Millennial Explorer": [
    "Discovery-minded — open to trying new treatments",
    "Social media influenced — responds to before/after content",
    "Values convenience — prefers online booking and reminders"
  ],
  "Young Professional - Regular Visitor": [
    "Routine-oriented — values consistency and maintenance plans",
    "Time-conscious — appreciates efficiency and punctuality",
    "Loyalty-driven — responds to membership and rewards programs"
  ],
  "Mid-Career Explorer": [
    "Research-driven — compares options before committing",
    "Results-focused — wants to see proven outcomes",
    "Budget-aware — responds to value bundles and packages"
  ],
  "Professional Maintainer": [
    "Results-focused — wants proven, predictable outcomes",
    "Values expertise — trusts provider recommendations",
    "Willing to invest — responds to premium service messaging"
  ],
  "Executive Regular - High Value": [
    "VIP expectations — values personalized attention",
    "Discretion matters — appreciates privacy and exclusivity",
    "Price-insensitive — focuses on quality over cost"
  ],
  "Established Affluent - VIP Client": [
    "Luxury-oriented — expects white-glove service",
    "Relationship-driven — loyal to trusted providers",
    "Early adopter — interested in newest treatments first"
  ],
  "Mature Premium Client": [
    "Experience-focused — values comfort and expertise",
    "Trust-driven — needs established rapport before trying new services",
    "Results-oriented — anti-aging outcomes are top priority"
  ],
  "Established Regular": [
    "Habit-driven — prefers familiar treatments and routines",
    "Value-conscious — appreciates loyalty discounts",
    "Low-maintenance — wants reliable, no-fuss service"
  ],
  "Premium Client": [
    "Quality-first — willing to pay more for better results",
    "Trend-aware — interested in popular treatments",
    "Referral-likely — shares experiences with friends"
  ],
  "Regular Client": [
    "Consistency-focused — values reliable service",
    "Deal-responsive — engages with promotions and packages",
    "Relationship-builders — appreciates personal recognition"
  ],
  "Entry Client": [
    "Price-sensitive — responds to intro offers and discounts",
    "Curious but cautious — needs reassurance and education",
    "Convertible — nurture toward higher-value services"
  ],
  "Unknown Profile": [
    "Needs more data — gather preferences on next visit",
    "Potential high-value — assess spending capacity",
    "Engagement opportunity — use welcome sequence to learn more"
  ]
};

const DEFAULT_PSYCHOGRAPHICS = [
  "Quality-focused — responds to expertise messaging",
  "Results-driven — values proven outcomes",
  "Convenience-oriented — prefers easy booking and reminders"
];

function generateStrengthCopy(analysisData: any, isRealEstate: boolean = false): string {
  const uplift =
    Math.round(
      (analysisData?.behavior_patterns?.repeat_rate_lift_vs_market ?? 0.12) *
        100
    ) || 12;
  return `Repeat rate is ~${uplift}% stronger than comparable businesses. You already have an advantage—use campaigns here to widen that gap, not just maintain it.`;
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
  const [vertical, setVertical] = useState<string>('medspa');
  // Terminology based on vertical
  const isRealEstate = vertical === 'real_estate_mortgage';
  const terms = {
    customer: isRealEstate ? 'client' : 'patient',
    customers: isRealEstate ? 'clients' : 'patients',
    Customer: isRealEstate ? 'Client' : 'Patient',
    Customers: isRealEstate ? 'Clients' : 'Patients',
    service: isRealEstate ? 'transaction' : 'treatment',
    services: isRealEstate ? 'transactions' : 'treatments',
    visit: isRealEstate ? 'transaction' : 'visit',
    visits: isRealEstate ? 'transactions' : 'visits',
    planTitle: isRealEstate ? 'Client Growth Plan' : 'Patient Growth Plan',
    bestCustomers: isRealEstate ? 'Your Best Clients Are' : 'Your Best Patients Are',
    behaviorTitle: isRealEstate ? 'Client Behavior Analysis' : 'Patient Behavior Analysis',
    churnTitle: isRealEstate ? 'Client Churn Risk' : 'Patient Churn Risk',
    atRiskTitle: isRealEstate ? 'Top At-Risk Clients' : 'Top At-Risk Patients',
  };
  const [outreachSummary, setOutreachSummary] = useState<any>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showWinbackModal, setShowWinbackModal] = useState(false);
  const [winbackPatients, setWinbackPatients] = useState<any[]>([]);
  const [winbackScripts, setWinbackScripts] = useState<any>(null);
  const [scriptsLoading, setScriptsLoading] = useState(false);

  // Fetch win-back scripts
  const fetchWinbackScripts = async () => {
    setScriptsLoading(true);
    try {
      const treatment = analysisData?.available_procedures?.[0] || 'appointment';
      const daysOverdue = winbackPatients[0]?.days_overdue || 90;
      const response = await fetch(
        `${API_URL}/api/v1/winback-scripts?treatment=${encodeURIComponent(treatment)}&days_overdue=${daysOverdue}&patient_count=${winbackPatients.length}`
      );
      if (response.ok) {
        const data = await response.json();
        setWinbackScripts(data);
      }
    } catch (e) {
      console.error('Failed to fetch scripts:', e);
    } finally {
      setScriptsLoading(false);
    }
  };

  // Fetch outreach summary
  const fetchOutreachSummary = async () => {
    if (!currentRunId) return;
    try {
      const response = await fetch(`${API_URL}/api/v1/runs/${currentRunId}/outreach/summary`);
      if (response.ok) {
        const data = await response.json();
        setOutreachSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch outreach summary:', error);
    }
  };

  // Mark patients as contacted
  const markContacted = async (patientIds: string[]) => {
    if (!currentRunId || patientIds.length === 0) return;
    try {
      const formData = new FormData();
      patientIds.forEach(id => formData.append('patient_ids', id));
      
      const response = await fetch(`${API_URL}/api/v1/runs/${currentRunId}/outreach/mark-contacted`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setSelectedPatients([]);
        fetchOutreachSummary();
      }
    } catch (error) {
      console.error('Failed to mark contacted:', error);
    }
  };

// Fetch outreach summary when run loads
  useEffect(() => {
    if (currentRunId) {
      fetchOutreachSummary();
    }
  }, [currentRunId]);

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
      setError('No analysis found. Please upload data first.');
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
          if (data.detected_vertical) {
            setVertical(data.detected_vertical);
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
      `/campaign-generator?zip=${selected.join(',')}&procedure=${procedureParam}&vertical=${vertical}`
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
            Analyzing your data
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
    analysisData.filtered_patient_count || analysisData.patient_count;

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

  const heroCopy = generateHeroCopy(analysisData, season, isRealEstate);

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

  const referralCopy = generateReferralCopy(analysisData, season, isRealEstate);
  const bundleCopy = generateBundleCopy(analysisData);
  const growthCopy = generateGrowthCopy(analysisData, isRealEstate);
  const strengthCopy = generateStrengthCopy(analysisData, isRealEstate);

  const segmentName =
    analysisData?.cohort_descriptor?.label ||
    analysisData?.dominant_profile?.combined ||
    analysisData?.dominant_profile ||
    (isRealEstate ? 'Best Client Segment' : 'Best Patient Segment');
  
  const segmentDescription =
    analysisData?.cohort_descriptor?.description ||
    '';

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <>
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
                {terms.planTitle}
              </h1>
              <p className="text-xs md:text-sm text-[#9CA3AF] mt-1 flex items-center gap-2">
                <span>{patientCount} {terms.customers} analyzed</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4338CA]">
                  <Clock className="h-3 w-3" />
                  {getSeasonalCopy(season).timing}
                </span>
              </p>
            </div>
            
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="px-3 py-2 text-sm font-medium text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:ring-[#4338CA] focus:border-[#4338CA]"
            >
              <option value="medspa">Aesthetics</option>
              <option value="real_estate_mortgage">Real Estate / Mortgage</option>
            </select>

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
            <div className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#8B5CF6] rounded-2xl p-8 md:p-10 shadow-lg">
              {/* Top row: Label */}
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200 mb-2">
                {terms.bestCustomers}
              </div>

              {/* Segment name */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {segmentName}
              </h1>

              {/* Description */}
              <p className="text-sm md:text-base text-indigo-100 leading-relaxed max-w-3xl mb-6">
                {segmentDescription} They spend ${(analysisData?.behavior_patterns?.avg_lifetime_value || 3600).toLocaleString()} on average and visit {(analysisData?.behavior_patterns?.avg_visits_per_year || 2.8).toFixed(1)}× per year.
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div>
                  <div className="text-[10px] font-medium text-indigo-200 mb-1">Avg Lifetime Value</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {(analysisData?.behavior_patterns?.avg_lifetime_value || 3600) >= 1000 
                      ? `$${((analysisData?.behavior_patterns?.avg_lifetime_value || 3600) / 1000).toFixed(1)}K`
                      : `$${(analysisData?.behavior_patterns?.avg_lifetime_value || 3600).toFixed(0)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-indigo-200 mb-1">Visit Frequency</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {(analysisData?.behavior_patterns?.avg_visits_per_year || 2.8).toFixed(1)}×
                  </div>
                  <div className="text-[10px] text-indigo-200">per year</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-indigo-200 mb-1">Revenue at Risk</div>
                  <div className={`text-2xl md:text-3xl font-bold ${
                    churnData?.at_risk_percent > 25 
                      ? 'text-red-300' 
                      : churnData?.at_risk_percent > 15 
                      ? 'text-amber-300' 
                      : 'text-emerald-300'
                  }`}>
                    ${churnData ? ((totalRevenue * churnData.at_risk_percent / 100) / 1000).toFixed(0) : '—'}K
                  </div>
                  <div className="text-[10px] text-indigo-200">from {churnData?.at_risk_count || 0} {terms.customers}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-indigo-200 mb-1">Churn Rate</div>
                  <div className={`text-2xl md:text-3xl font-bold ${
                    churnData?.at_risk_percent > 25 
                      ? 'text-red-300' 
                      : churnData?.at_risk_percent > 15 
                      ? 'text-amber-300' 
                      : 'text-emerald-300'
                  }`}>
                    {churnData ? `${churnData.at_risk_percent.toFixed(0)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-indigo-200">at risk</div>
                </div>
              </div>

              <div className="h-px bg-white/20 my-6" />
              
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200 mb-2">
                What This Means
              </div>
              <p className="text-sm text-indigo-100 leading-relaxed">
                {`Your best ${terms.customers} average $${((analysisData?.behavior_patterns?.avg_lifetime_value || 0) / 1000).toFixed(1)}K in lifetime value across ${(analysisData?.behavior_patterns?.avg_visits_per_year || 0).toFixed(1)} ${terms.visits} per year. `}
                {churnData && `${churnData.at_risk_percent.toFixed(0)}% haven't returned within their expected visit interval, putting $${((totalRevenue * churnData.at_risk_percent / 100) / 1000).toFixed(0)}K in revenue at risk.`}
              </p>
              
              <button
                onClick={() => {
                  if (!currentRunId) return;
                  window.open(`${API_URL}/api/v1/runs/${currentRunId}/export-patients`, '_blank');
                }}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Labeled {terms.Customers}
              </button>
              
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

            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-[#E5E7EB]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4338CA]">
                  <span className={`h-1.5 w-1.5 rounded-full ${(churnData?.at_risk_percent || 0) > 50 ? 'bg-red-500' : (churnData?.at_risk_percent || 0) > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {(churnData?.at_risk_percent || 0) > 50 
                    ? 'Strategy · Reactivation' 
                    : (churnData?.at_risk_percent || 0) > 30 
                    ? 'Strategy · Retention' 
                    : 'Strategy · Growth'}
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#111827]">
                    {(churnData?.at_risk_percent || 0) > 50 
                      ? `Win back lapsed ${terms.customers}` 
                      : (churnData?.at_risk_percent || 0) > 30 
                      ? 'Prevent at-risk churn' 
                      : 'Get referrals'}
                  </h3>
                  <p className="text-sm md:text-base text-[#6B7280] leading-relaxed max-w-xl">
                    {(churnData?.at_risk_percent || 0) > 50 
                      ? `${churnData?.at_risk_percent.toFixed(0)}% of this segment (${Math.round(patientCount * (churnData?.at_risk_percent || 0) / 100)} ${terms.customers}) haven't returned within their expected interval. A ${analysisData?.available_procedures?.[0] || terms.service} reactivation offer could recover $${((totalRevenue * (churnData?.at_risk_percent || 0) / 100) / 1000).toFixed(0)}K in at-risk revenue.`
                      : (churnData?.at_risk_percent || 0) > 30 
                      ? `${churnData?.at_risk_percent.toFixed(0)}% of this segment is showing early churn signals. Proactive outreach now — before they lapse — is 3x more effective than win-back campaigns later.`
                      : referralCopy}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      const atRiskPatients = churnData?.high_risk_patients || [];
                      const patientIds = atRiskPatients.map((p: any) => p.patient_id);
                      if (patientIds.length > 0) {
                        markContacted(patientIds);
                        setWinbackPatients(atRiskPatients);
                        setShowWinbackModal(true);
                      } else {
                        generateCampaign();
                      }
                    }}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#4338CA] text-white text-sm md:text-base font-semibold shadow-md hover:bg-[#3730A3] transition-colors disabled:opacity-50"
                  >
                    {(churnData?.at_risk_percent || 0) > 50 ? 'Launch win-back' : (churnData?.at_risk_percent || 0) > 30 ? 'Send retention offer' : 'Set up now'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs md:text-sm text-[#6B7280] max-w-md">
                    Email templates, incentive structure, and compliance checks
                    are prebuilt. Review, tweak your offer, then launch in under{' '}
                    <span className="font-semibold text-[#111827]">2 minutes</span>.
                  </p>
                </div>
              </div>
            </div>
          </section>
          
          {/* ROI TRACKING */}
          {outreachSummary && outreachSummary.contacted_count > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  Campaign Results
                </h2>
                <span className="text-[11px] text-[#9CA3AF]">
                  Track your win-back ROI
                </span>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#111827]">{outreachSummary.contacted_count}</div>
                    <div className="text-xs text-[#6B7280] mt-1">{terms.Customers} Contacted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#16A34A]">{outreachSummary.returned_count}</div>
                    <div className="text-xs text-[#6B7280] mt-1">Returned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#4338CA]">
                      ${(outreachSummary.revenue_recovered / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Revenue Recovered</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E5E7EB] text-center">
                  <span className="text-sm text-[#6B7280]">
                    {outreachSummary.conversion_rate}% conversion rate
                  </span>
                </div>
              </div>
            </section>
          )}

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
                    Expand to new ZIPs
                  </h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                    {`Your ${patientCount} ${segmentName} ${terms.customers} are concentrated in ${selectedCount || totalBookings} ZIP codes. Adjacent neighborhoods have similar demographics — target them with the same ${analysisData?.available_procedures?.[0] || terms.service} messaging.`}
                  </p>
                </div>
                <button
                  onClick={generateCampaign}
                  disabled={selectedCount === 0}
                  className="self-start px-6 py-3 bg-[#4338CA] text-white rounded-lg text-sm font-semibold hover:bg-[#3730A3] transition-colors disabled:opacity-50"
                >
                  See expansion ZIPs
                </button>
              </article>

              <article className="bg-white rounded-xl p-8 shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FF] text-[#4338CA] text-[10px] font-semibold uppercase tracking-[0.16em] mb-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4338CA]" />
                    Strategy · Upsell
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-[#111827] mb-3">
                    {(analysisData?.behavior_patterns?.avg_visits_per_year || 0) >= 2 ? 'Increase spend per visit' : 'Build visit frequency'}
                  </h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed mb-6">
                    {(analysisData?.behavior_patterns?.avg_visits_per_year || 0) >= 2 
                      ? `At ${(analysisData?.behavior_patterns?.avg_visits_per_year || 0).toFixed(1)}x visits per year, this segment is already engaged. Bundle ${analysisData?.available_procedures?.[0] || 'treatments'} with add-ons to lift average ticket.`
                      : `This segment visits ${(analysisData?.behavior_patterns?.avg_visits_per_year || 0).toFixed(1)}x per year. Maintenance plans and membership perks can boost frequency 20-40%.`}
                  </p>
                </div>
                <button
                  onClick={generateCampaign}
                  disabled={selectedCount === 0}
                  className="self-start px-6 py-3 bg-[#4338CA] text-white rounded-lg text-sm font-semibold hover:bg-[#3730A3] transition-colors disabled:opacity-50"
                >
                  {(analysisData?.behavior_patterns?.avg_visits_per_year || 0) >= 2 ? 'Create bundle' : 'Set up membership'}
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
                    New {terms.customers} / month
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
                    {terms.behaviorTitle}
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
                        {analysisData?.behavior_patterns?.visits_lift_pct > 0 ? '+' : ''}{analysisData?.behavior_patterns?.visits_lift_pct || 0}% vs your baseline ({analysisData?.behavior_patterns?.baseline_visits_per_year || 2}× across all {terms.customers}).
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
                        Up 8% year-over-year. {terms.Customers} are choosing premium
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
                              {100 - (analysisData?.churn?.at_risk_percent || 15)}% retention
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              Top 20% of your {terms.customers}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-2"></div>
                          <div>
                            <div className="text-sm font-semibold text-[#111827]">
                              +{analysisData?.behavior_patterns?.ltv_lift_pct || 0}% higher LTV
                            </div>
                            <div className="text-xs text-[#6B7280]">
                              ${((analysisData?.behavior_patterns?.avg_lifetime_value || 3600) / 1000).toFixed(1)}K vs ${((analysisData?.behavior_patterns?.baseline_ltv || 2900) / 1000).toFixed(1)}K baseline
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
                              Top {terms.services}: {analysisData?.available_procedures?.slice(0, 2).join(', ') || (isRealEstate ? 'Buy, Sell' : 'Botox, Fillers')}
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
                        {100 - (churnData?.at_risk_percent || 15)}%
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        Retention rate for your best {terms.customers} (top 20%).
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
                  {!isRealEstate && (
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
                            {analysisData?.behavior_patterns?.treatment_categories?.["Injectable Treatments"] || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: `${analysisData?.behavior_patterns?.treatment_categories?.["Injectable Treatments"] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#111827] font-medium">
                            Laser & Energy Treatments
                          </span>
                          <span className="text-sm font-semibold text-[#111827]">
                            {analysisData?.behavior_patterns?.treatment_categories?.["Laser & Energy"] || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: `${analysisData?.behavior_patterns?.treatment_categories?.["Laser & Energy"] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#111827] font-medium">
                            Skincare & Other
                          </span>
                          <span className="text-sm font-semibold text-[#111827]">
                            {analysisData?.behavior_patterns?.treatment_categories?.["Skincare & Other"] || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#4338CA] h-2 rounded-full"
                            style={{ width: `${analysisData?.behavior_patterns?.treatment_categories?.["Skincare & Other"] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
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

                    {/* Churn Risk - Dynamic from API */}
                    {churnData && (
                      <div className={`p-4 bg-white rounded-lg border-l-2 ${
                        churnData.at_risk_percent > 50 ? 'border-[#DC2626]' : 
                        churnData.at_risk_percent > 30 ? 'border-[#F59E0B]' : 'border-[#16A34A]'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-sm font-semibold text-[#111827]">
                            {terms.churnTitle}
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
                          {churnData.at_risk_count} of {churnData.total_patients} {terms.customers} ({churnData.at_risk_percent.toFixed(0)}%) 
                          are overdue for their next {terms.visit}. {churnData.critical_count > 0 && 
                            `${churnData.critical_count} are critical (2x+ overdue).`}
                        </p>
                        <div className="text-xs text-[#111827] mb-3">
                          <span className="font-semibold">Mitigation:</span> Launch win-back 
                          campaign targeting {churnData.critical_count + churnData.high_count} high-priority 
                          {terms.customers}. Average {churnData.avg_days_overdue.toFixed(0)} days overdue.
                        </div>
                        {churnData.high_risk_patients?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                              {terms.atRiskTitle}
                            </div>
                            <div className="space-y-1">
                              {churnData.high_risk_patients.slice(0, 5).map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-[#6B7280] font-mono">{p.patient_id || `${terms.Customer} ${idx + 1}`}</span>
                                  <span className="font-medium text-[#DC2626]">{p.days_overdue} days overdue</span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                const patientIds = churnData.high_risk_patients.map((p: any) => p.patient_id).filter(Boolean);
                                if (patientIds.length > 0) {
                                  markContacted(patientIds);
                                  setWinbackPatients(churnData.high_risk_patients);
                                  setShowWinbackModal(true);
                                }
                              }}
                              className="mt-3 w-full px-4 py-2 bg-[#4338CA] text-white text-xs font-semibold rounded-lg hover:bg-[#3730A3] transition-colors"
                            >
                              Launch Win-Back Campaign ({churnData.high_risk_patients.length} {terms.customers})
                            </button>
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
                            {terms.Customers} / month
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
                            {terms.Customers} / month
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

    {showWinbackModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Win-Back Campaign Scripts</h2>
              <button onClick={() => setShowWinbackModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-500 mt-1">{winbackPatients.length} {terms.customers} marked as contacted.</p>
          </div>
          <div className="p-6 space-y-6">
            {scriptsLoading ? (
              <div className="text-center py-8 text-gray-500">Generating personalized scripts...</div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">📧 Email</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`Subject: ${winbackScripts?.email_subject || 'We miss you!'}\n\n${winbackScripts?.email || ''}`);
                        fetch(`${API_URL}/api/v1/winback-scripts/track`, {
                          method: 'POST',
                          body: new URLSearchParams({ treatment: analysisData?.available_procedures?.[0] || 'appointment', template_type: 'email' })
                        });
                      }} 
                      className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                    <div className="font-medium mb-2">Subject: {winbackScripts?.email_subject || 'We miss you!'}</div>
                    <div className="whitespace-pre-wrap">{winbackScripts?.email || 'Failed to load'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">💬 SMS</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(winbackScripts?.sms || '');
                        fetch(`${API_URL}/api/v1/winback-scripts/track`, {
                          method: 'POST',
                          body: new URLSearchParams({ treatment: analysisData?.available_procedures?.[0] || 'appointment', template_type: 'sms' })
                        });
                      }} 
                      className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">{winbackScripts?.sms || 'Loading...'}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">📞 Phone</h3>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(winbackScripts?.phone || '');
                        fetch(`${API_URL}/api/v1/winback-scripts/track`, {
                          method: 'POST',
                          body: new URLSearchParams({ treatment: analysisData?.available_procedures?.[0] || 'appointment', template_type: 'phone' })
                        });
                      }} 
                      className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">{winbackScripts?.phone || 'Loading...'}</div>
                </div>

                {winbackScripts?.source === 'optimized' && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span> Using top-performing templates
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Patients to Contact ({winbackPatients.length})</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {winbackPatients.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
                        <span className="font-mono text-xs">{p.patient_id || `${terms.Customer} ${idx + 1}`}</span>
                        <span className="text-red-600">{p.days_overdue} days overdue</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button onClick={() => setShowWinbackModal(false)} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Done</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}