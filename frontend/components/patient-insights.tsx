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
  Download,
  Star,
  Users,
  Package,
  PlusCircle,
} from 'lucide-react';
import { useState, useEffect, useRef} from 'react';
import { useRouter } from 'next/navigation';
import { SMSSendModal } from './sms-send-modal';
import { CampaignWorkflowModal } from './campaign-workflow-modal';
import { useInsight } from './insights/InsightProvider';
import { DISC_TYPES } from '@/lib/industryConfig';


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
  const { showInsight } = useInsight();
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [smsCampaigns, setSmsCampaigns] = useState<any[]>([]);
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
  const isMortgage = vertical === 'mortgage' || vertical === 'real_estate_mortgage';
  const terms = {
    customer: isMortgage ? 'borrower' : isRealEstate ? 'client' : 'patient',
    customers: isMortgage ? 'borrowers' : isRealEstate ? 'clients' : 'patients',
    Customer: isMortgage ? 'Borrower' : isRealEstate ? 'Client' : 'Patient',
    Customers: isMortgage ? 'Borrowers' : isRealEstate ? 'Clients' : 'Patients',
    service: isMortgage ? 'loan' : isRealEstate ? 'transaction' : 'treatment',
    services: isMortgage ? 'loans' : isRealEstate ? 'transactions' : 'treatments',
    visit: isMortgage ? 'application' : isRealEstate ? 'transaction' : 'visit',
    visits: isMortgage ? 'applications' : isRealEstate ? 'transactions' : 'visits',
    planTitle: isMortgage ? 'Pipeline Growth Plan' : isRealEstate ? 'Client Growth Plan' : 'Patient Growth Plan',
    bestCustomers: isMortgage ? 'Your Best Borrowers Are' : isRealEstate ? 'Your Best Clients Are' : 'Your Best Patients Are',
    behaviorTitle: isMortgage ? 'Borrower Behavior Analysis' : isRealEstate ? 'Client Behavior Analysis' : 'Patient Behavior Analysis',
    churnTitle: isMortgage ? 'Pre-Approvals at Risk' : isRealEstate ? 'Client Churn Risk' : 'Patient Churn Risk',
    atRiskTitle: isMortgage ? 'Stale Pre-Approvals' : isRealEstate ? 'Top At-Risk Clients' : 'Top At-Risk Patients',
  };
  const [outreachSummary, setOutreachSummary] = useState<any>(null);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [showWinbackModal, setShowWinbackModal] = useState(false);
  const [winbackPatients, setWinbackPatients] = useState<any[]>([]);
  const [winbackScripts, setWinbackScripts] = useState<any>(null);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [outreachIds, setOutreachIds] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [recoveryAnalytics, setRecoveryAnalytics] = useState<any>(null);
  const [behaviorPatterns, setBehaviorPatterns] = useState<any>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [selectedHighFreq, setSelectedHighFreq] = useState<Set<string>>(new Set());
  const [selectedReferrers, setSelectedReferrers] = useState<Set<string>>(new Set());
  const [selectedOneDone, setSelectedOneDone] = useState<Set<string>>(new Set());
  const [selectedLapsed, setSelectedLapsed] = useState<Set<string>>(new Set());

  // Retention action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [actionModalData, setActionModalData] = useState<{
    segment: string;
    title: string;
    count: number;
    patients: Array<{patient_id: string; name?: string; phone?: string} | string>;
    action: string;
    cta: string;
    crossSellContext?: {
      newService: string;
      currentService: string;
    };
  } | null>(null);
  const [dynamicCopy, setDynamicCopy] = useState<{
    email_subject: string;
    email_body: string;
    sms: string;
  } | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

// Fetch recovery analytics
  const fetchRecoveryAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/analytics/recovery-rates`);
      if (response.ok) {
        const data = await response.json();
        setRecoveryAnalytics(data);
      }
    } catch (e) {
      console.error('Failed to fetch recovery analytics:', e);
    }
  };

  useEffect(() => {
    fetchRecoveryAnalytics();
  }, []);

  // Fetch behavior patterns for medspa
  const fetchBehaviorPatterns = async () => {
    const params = new URLSearchParams(window.location.search);
    const runId = params.get('runId');
    if (!runId || isMortgage) return;
    try {
      const formData = new FormData();
      formData.append('run_id', runId);
      const response = await fetch(`${API_URL}/api/v1/segments/behavior-patterns`, {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setBehaviorPatterns(data);
        console.log('[PATTERNS]', data);
      }
    } catch (e) {
      console.error('Failed to fetch behavior patterns:', e);
    }
  };

  useEffect(() => {
    if (analysisData) {
      fetchBehaviorPatterns();
    }
  }, [analysisData, isMortgage]);

// Update borrower outcome
  const updateOutcome = async (patientId: string, outcome: string) => {
    setOutcomes(prev => ({ ...prev, [patientId]: outcome }));
    
    // If we have the outreach ID, update backend
    const outreachId = outreachIds[patientId];
    if (outreachId) {
      try {
        const formData = new FormData();
        formData.append('outcome', outcome);
        await fetch(`${API_URL}/api/v1/outreach/${outreachId}/outcome`, {
          method: 'POST',
          body: formData
        });
      } catch (e) {
        console.error('Failed to update outcome:', e);
      }
    }
  };

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
  const markContacted = async (patientIds: string[], patientsData?: any[]) => {
    if (!currentRunId || patientIds.length === 0) return;
    try {
      const formData = new FormData();
      patientIds.forEach(id => formData.append('patient_ids', id));
      
      if (patientsData && patientsData.length > 0) {
        formData.append('days_stale_list', patientsData.map(p => p.days_stale || p.days_overdue || 0).join(','));
        formData.append('loan_amount_list', patientsData.map(p => p.loan_amount || 0).join(','));
      }
      
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
  // Fetch SMS campaigns
  useEffect(() => {
    if (!currentRunId || loading) return;
    const fetchSMSCampaigns = async () => {
      try {
        const res = await fetch(`${API_URL}/api/sms/campaigns?run_id=${currentRunId}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSmsCampaigns(data);
        }
      } catch (e) {
        console.error("Failed to fetch SMS campaigns:", e);
      }
    };
    fetchSMSCampaigns();
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

  // Generate insights when analysis data changes
  useEffect(() => {
    if (!analysisData || isMortgage) return;

    // Priority order: Urgent > Market Signal > Campaign Win > Milestone
    // Only show ONE insight at a time based on priority

    // 1. URGENT: VIPs at risk (Horizontal Bar)
    const vipsAtRisk = analysisData.patient_segments?.lapsed_regulars?.count || 0;
    const vipRevenueAtRisk = analysisData.patient_segments?.lapsed_regulars?.revenue_at_risk || 0;
    if (vipsAtRisk > 0 && vipRevenueAtRisk > 0) {
      showInsight({
        id: `urgent_vips_${analysisData.upload_id || new Date().getMonth()}`,
        type: 'urgent',
        headline: `${vipsAtRisk} VIPs haven't been back in 90+ days`,
        subtext: `$${vipRevenueAtRisk.toLocaleString()} in annual revenue at risk`,
        cta: 'Send win-back',
        anchor: '#decision-queue',
      });
      return;
    }

    // 2. URGENT: High-severity strategic insights (Horizontal Bar)
    if (analysisData.strategic_insights && analysisData.strategic_insights.length > 0) {
      const highRiskInsight = analysisData.strategic_insights.find((i: any) => i.severity === 'high');
      if (highRiskInsight) {
        showInsight({
          id: `urgent_risk_${analysisData.upload_id || new Date().getMonth()}`,
          type: 'urgent',
          headline: highRiskInsight.title || 'High churn risk detected',
          subtext: highRiskInsight.description || 'Multiple warning signals detected',
          cta: 'Review risks',
          anchor: '#strategic-insights',
        });
        return;
      }
    }

    // 3. MARKET SIGNAL: Cross-sell opportunity (Horizontal Bar)
    if (analysisData.service_analysis?.primary_opportunity) {
      const opp = analysisData.service_analysis.primary_opportunity;
      showInsight({
        id: `market_signal_${opp.title}_${analysisData.upload_id || new Date().getMonth()}`,
        type: 'market_signal',
        headline: opp.title,
        subtext: `${opp.patient_count} patients · $${opp.potential_revenue?.toLocaleString()} potential`,
        cta: 'View patients',
        anchor: '#cross-sell-section',
      });
      return;
    }

    // 4. MILESTONE: Big revenue wins (Side Box, not full-screen)
    if (outreachSummary?.returned_count > 0 && outreachSummary?.revenue_recovered >= 5000) {
      showInsight({
        id: `milestone_${new Date().getMonth()}_${new Date().getFullYear()}`,
        type: 'milestone',
        metric: `$${Math.round(outreachSummary.revenue_recovered).toLocaleString()}`,
        metricLabel: 'This month',
        headline: 'recovered',
        supportingStat: `${outreachSummary.returned_count} patients came back`,
      });
      return;
    }

    // 5. CAMPAIGN WIN: Regular wins (Side Box - Key Insight)
    if (outreachSummary?.returned_count > 0 && outreachSummary?.revenue_recovered > 0) {
      showInsight({
        id: `campaign_win_${new Date().getMonth()}_${new Date().getFullYear()}`,
        type: 'campaign_win',
        metric: `$${Math.round(outreachSummary.revenue_recovered).toLocaleString()}`,
        metricLabel: 'This month',
        headline: 'recovered',
        supportingStat: `${outreachSummary.returned_count} patients returned`,
      });
      return;
    }

    // 6. BENCHMARK: Retention above average (Side Box - Key Insight)
    const totalPatients = analysisData.patient_count || 0;
    const highFreqCount = analysisData.patient_segments?.high_frequency?.count || 0;
    if (totalPatients > 0 && highFreqCount > 0) {
      const retentionRate = Math.round((highFreqCount / totalPatients) * 100);
      if (retentionRate >= 15) {
        showInsight({
          id: `benchmark_${analysisData.upload_id || new Date().getMonth()}`,
          type: 'benchmark',
          metric: `${retentionRate}%`,
          metricLabel: '12-month retention',
          headline: 'above average',
          supportingStat: 'Industry median: 12%',
        });
      }
    }
  }, [analysisData, outreachSummary, isMortgage, showInsight, router]);

  // Dev toggle: Ctrl+Shift+I to test random insights
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+I or Cmd+Shift+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();

        // Array of test insights
        const testInsights = [
          // Urgent - VIPs at risk
          {
            id: `dev_test_urgent_${Date.now()}`,
            type: 'urgent' as const,
            headline: '12 VIPs haven\'t been back in 90+ days',
            subtext: '$28,400 in annual revenue at risk',
            cta: 'Send win-back',
            anchor: '#decision-queue',
          },
          // Urgent - High churn
          {
            id: `dev_test_urgent_churn_${Date.now()}`,
            type: 'urgent' as const,
            headline: 'High churn risk detected',
            subtext: '45% of new patients leave after first visit',
            cta: 'Review risks',
            anchor: '#strategic-insights',
          },
          // Market Signal - Cross-sell
          {
            id: `dev_test_market_${Date.now()}`,
            type: 'market_signal' as const,
            headline: 'Botox patients ready for skincare',
            subtext: '34 patients · $12,800 potential',
            cta: 'View patients',
            anchor: '#cross-sell-section',
          },
          // Timing - Seasonal opportunity
          {
            id: `dev_test_timing_${Date.now()}`,
            type: 'timing' as const,
            headline: 'Launch summer prep campaigns now',
            subtext: 'Peak booking window closes in 14 days',
            cta: 'Create campaign',
            anchor: '#campaigns',
          },
          // Milestone - Big win
          {
            id: `dev_test_milestone_${Date.now()}`,
            type: 'milestone' as const,
            metric: '$12,500',
            metricLabel: 'This month',
            headline: 'recovered',
            supportingStat: '8 patients came back',
          },
          // Campaign Win
          {
            id: `dev_test_campaign_${Date.now()}`,
            type: 'campaign_win' as const,
            metric: '$4,200',
            metricLabel: 'This month',
            headline: 'recovered',
            supportingStat: '3 patients returned',
          },
          // Benchmark
          {
            id: `dev_test_benchmark_${Date.now()}`,
            type: 'benchmark' as const,
            metric: '18%',
            metricLabel: '12-month retention',
            headline: 'above average',
            supportingStat: 'Industry median: 12%',
          },
        ];

        // Pick random insight
        const randomInsight = testInsights[Math.floor(Math.random() * testInsights.length)];

        // All insights use showInsight (including milestones)
        showInsight(randomInsight);

        console.log('🎯 Dev insight triggered:', randomInsight.type);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInsight]);

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
      `/campaign-generator?segmentId=${currentRunId}&zip=${selected.join(',')}&procedure=${procedureParam}&vertical=${vertical}`
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
            className="bg-[#6366f1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4f46e5] transition-colors"
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#CBD5E1] border-t-[#6366f1] mx-auto mb-4" />
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

  const avgLtv = analysisData?.behavior_patterns?.avg_lifetime_value || 3600;
  const roas =
    costPerBooking > 0
      ? (avgLtv / costPerBooking).toFixed(1)
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

  // Generate message templates for retention actions
  const getMessageTemplates = (segment: string, patientCount: number) => {
    const clinicName = "[Your Clinic Name]";
    const templates: Record<string, { email: { subject: string; body: string }; sms: string }> = {
      'high-frequency': {
        email: {
          subject: `A special thank you from ${clinicName}`,
          body: `Hi [Patient Name],

We wanted to take a moment to say thank you. You're one of our most valued patients, and we truly appreciate your continued trust in us.

As a VIP patient, we'd love to offer you an exclusive benefit:
• 15% off your next treatment
• Priority booking for new services
• Complimentary add-on at your next visit

Book your next appointment and mention "VIP reward" to redeem.

We look forward to seeing you soon!

Warm regards,
${clinicName} Team`
        },
        sms: `Hi [Name]! You're a VIP at ${clinicName} 💎 As a thank you, enjoy 15% off your next visit. Book now & mention "VIP reward" to redeem. We appreciate you!`
      },
      'referrers': {
        email: {
          subject: `Start earning rewards for referrals at ${clinicName}`,
          body: `Hi [Patient Name],

We noticed you've been sharing the love — thank you! Your referrals mean the world to us.

We're excited to invite you to our new referral program:
• Give $50 off to friends you refer
• Get $50 credit for each successful referral
• Stack rewards with no limit

Simply share your unique link (below) or have friends mention your name when booking.

[Your referral link]

Thank you for being an ambassador for ${clinicName}!

Warm regards,
${clinicName} Team`
        },
        sms: `Hi [Name]! Thanks for spreading the word about ${clinicName} 🙌 New referral program: Give $50, Get $50 for every friend you send our way. Reply YES for your referral link!`
      },
      'one-and-done': {
        email: {
          subject: `We'd love to see you again at ${clinicName}`,
          body: `Hi [Patient Name],

We noticed it's been a while since your last visit, and we wanted to check in.

Was there anything about your experience we could improve? We'd genuinely love to hear your feedback.

If you're ready to come back, we'd like to offer you:
• 20% off your next treatment
• Complimentary consultation to discuss your goals
• Flexible scheduling to fit your calendar

Simply reply to this email or call us to book. We'd love the chance to welcome you back.

Warm regards,
${clinicName} Team`
        },
        sms: `Hi [Name], it's ${clinicName}! We miss you 💙 Come back and enjoy 20% off your next visit. Book this week and we'll add a complimentary consultation. Interested?`
      },
      'lapsed-regulars': {
        email: {
          subject: `[Patient Name], we miss you at ${clinicName}`,
          body: `Hi [Patient Name],

It's been a while, and we've been thinking about you. You used to be one of our regulars, and we genuinely miss having you here.

We'd love to know — is everything okay? If there's anything we could have done better, we're all ears.

When you're ready to come back, we have a special welcome-back offer just for you:
• 25% off any treatment
• Priority scheduling
• Personal consultation to refresh your treatment plan

Just reply to this email or give us a call. We'd love to catch up.

Missing you,
${clinicName} Team`
        },
        sms: `Hi [Name], we miss seeing you at ${clinicName}! 💙 It's been a while. Everything okay? We'd love to welcome you back with 25% off. Can we schedule a time to chat?`
      }
    };
    return templates[segment] || templates['one-and-done'];
  };

  // Handle opening the action modal
  const openActionModal = async (
    segment: string,
    title: string,
    count: number,
    patients: Array<{patient_id: string; name?: string; phone?: string} | string>,
    action: string,
    cta: string,
    crossSellContext?: { newService: string; currentService: string }
  ) => {
    setActionModalData({ segment, title, count, patients, action, cta, crossSellContext });
    setShowActionModal(true);
    setDynamicCopy(null);
    setCopyLoading(true);
    
    // Fetch dynamic copy from API
    try {
      const formData = new FormData();
      formData.append('segment', segment);
      formData.append('patient_count', String(count));
      
      // Add context from analysis data if available
      if (analysisData?.behavior_patterns?.avg_lifetime_value) {
        formData.append('avg_ltv', String(analysisData.behavior_patterns.avg_lifetime_value));
      }
      if (analysisData?.behavior_patterns?.avg_visits_per_year) {
        formData.append('avg_visits', String(analysisData.behavior_patterns.avg_visits_per_year));
      }
      if (analysisData?.available_procedures?.length > 0) {
        formData.append('top_procedures', analysisData.available_procedures.slice(0, 3).join(','));
      }
      
      const response = await fetch(`${API_URL}/api/v1/generate-outreach-copy`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        setDynamicCopy({
          email_subject: data.email_subject,
          email_body: data.email_body,
          sms: data.sms,
        });
      } else {
        // Fall back to static templates
        const templates = getMessageTemplates(segment, count);
        setDynamicCopy({
          email_subject: templates.email.subject,
          email_body: templates.email.body,
          sms: templates.sms,
        });
      }
    } catch (error) {
      // Fall back to static templates on error
      const templates = getMessageTemplates(segment, count);
      setDynamicCopy({
        email_subject: templates.email.subject,
        email_body: templates.email.body,
        sms: templates.sms,
      });
    } finally {
      setCopyLoading(false);
    }
  };

  // Handle CSV export
  const handleExportCSV = (patients: Array<{patient_id: string; name?: string; phone?: string} | string>, segmentName: string) => {
    const patientIds = patients.map(p => typeof p === "object" ? p.patient_id : p);
    const csvContent = "Patient ID\n" + patientIds.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${segmentName.replace(/\s+/g, '-').toLowerCase()}-patients.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const recordConversion = async (campaignId: string, delta: number) => {
    try {
      const res = await fetch(`${API_URL}/api/sms/campaigns/${campaignId}/conversion?count=${delta}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSmsCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, conversions: data.conversions } : c));
      }
    } catch (e) {
      console.error("Failed to record conversion:", e);
    }
  };

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
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e0e7ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6366f1]">
                  <Clock className="h-3 w-3" />
                  {getSeasonalCopy(season).timing}
                </span>
              </p>
            </div>
            
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="px-3 py-2 text-sm font-medium text-[#111827] bg-white border border-[#CBD5E1] rounded-lg focus:ring-[#6366f1] focus:border-[#6366f1]"
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
                  className="flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium text-[#111827] bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#eef2ff] disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Target className="h-4 w-4 text-[#6366f1]" />
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
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-[#e0e7ff] rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedProcedures.includes('all')}
                          onChange={() => toggleProcedure('all')}
                          className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
                        />
                        <span className="text-sm text-[#111827]">
                          All Procedures
                        </span>
                      </label>
                      {availableProcedures.map((proc) => (
                        <label
                          key={proc}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-[#e0e7ff] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProcedures.includes(proc)}
                            onChange={() => toggleProcedure(proc)}
                            className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
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
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6366f1] rounded-lg hover:bg-[#4f46e5] disabled:opacity-50"
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
          {/* PATIENT HEALTH CHECK HERO */}
          <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">
            
            {/* Header row */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">Patient Health Check</div>
                <h2 className="text-2xl font-bold text-gray-900">{patientCount} patients analyzed</h2>
              </div>
              <button 
                onClick={() => {/* export handler */}}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
            
            {/* Metrics row - inline, clean */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 mb-6">
              <span><span className="font-medium text-gray-900">${(totalRevenue / 1000).toFixed(0)}K</span> revenue</span>
              <span className="text-gray-300">·</span>
              <span><span className="font-medium text-gray-900">${Math.round(totalRevenue / patientCount)}</span> avg LTV</span>
              <span className="text-gray-300">·</span>
              <span><span className="font-medium text-gray-900">{(analysisData?.behavior_patterns?.avg_visits_per_patient || 2.1).toFixed(1)}×</span> visits/yr</span>
              <span className="text-gray-300">·</span>
              <span><span className="font-medium text-red-600">{churnData?.at_risk_percent || 0}%</span> churn</span>
            </div>
            
            {/* Key Insight */}
            <div className="border-l-4 border-indigo-500 bg-gray-50 rounded-r-lg p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">The picture:</span>{' '}
                Your {analysisData?.patient_segments?.high_frequency?.count || 0} VIPs prove patients <em>can</em> become loyal — they visit 4×+ and spend 3× more. 
                But {churnData?.at_risk_percent || 0}% churn means most leave after 2 visits, before they're profitable at ${Math.round(totalRevenue / patientCount)} LTV. 
                Good news: {analysisData?.patient_segments?.referral_champions?.count || 0} patients already refer friends. 
                Fix retention and that word-of-mouth compounds instead of leaking. The actions below are sorted by impact.
              </p>
            </div>
            
            {/* Top services */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Top services:</span>
              {analysisData?.service_analysis?.top_services?.slice(0, 2).map((service: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{service}</span>
              )) || (
              <>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">Botox</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">Filler</span>
              </>
            )}
              <span className="text-gray-300 mx-1">·</span>
              <span className="text-orange-600 font-medium">No skincare uptake</span>
            </div>
          </section>

          {/* ================================================================ */}
          {/* MEDSPA: DECISION QUEUE SECTION                                */}
          {/* Clean, calm aesthetic matching landing page                   */}
          {/* ================================================================ */}
          {!isMortgage && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-10">
              <div className="max-w-2xl mx-auto">

                {/* Section header */}
                <div className="mb-5">
                  <h2 className="font-semibold text-gray-900">What to do now</h2>
                  <p className="text-sm text-gray-500">Prioritized by impact</p>
                </div>

                <div className="space-y-3">
                  
                  {/* 1. One-and-done patients */}
                  <div
                    onClick={() => {
                      openActionModal(
                        'one-and-done',
                        'One-and-done patients',
                        analysisData?.patient_segments?.one_and_done?.count || 0,
                        analysisData?.patient_segments?.one_and_done?.patients || [],
                        'win-back',
                        'Send win-back text'
                      );
                    }}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">One-and-done patients</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Act first</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analysisData?.patient_segments?.one_and_done?.count || 0} patients · ${(analysisData?.patient_segments?.one_and_done?.potential_recovery || 0).toLocaleString()} recoverable
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(
                          'one-and-done',
                          'One-and-done patients',
                          analysisData?.patient_segments?.one_and_done?.count || 0,
                          analysisData?.patient_segments?.one_and_done?.patients || [],
                          'win-back',
                          'Send win-back text'
                        );
                      }}
                      className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      Send check-in
                    </button>
                  </div>

                  {/* 2. Lapsed regulars */}
                  <div
                    onClick={() => {
                      openActionModal(
                        'lapsed-regulars',
                        'Lapsed regulars',
                        analysisData?.patient_segments?.lapsed_regulars?.count || 0,
                        analysisData?.patient_segments?.lapsed_regulars?.patients || [],
                        'personal-outreach',
                        'Start personal outreach'
                      );
                    }}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">Lapsed regulars</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">At risk</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analysisData?.patient_segments?.lapsed_regulars?.count || 0} patients · ${(analysisData?.patient_segments?.lapsed_regulars?.revenue_at_risk || 0).toLocaleString()} at risk
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(
                          'lapsed-regulars',
                          'Lapsed regulars',
                          analysisData?.patient_segments?.lapsed_regulars?.count || 0,
                          analysisData?.patient_segments?.lapsed_regulars?.patients || [],
                          'personal-outreach',
                          'Start personal outreach'
                        );
                      }}
                      className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      Reopen
                    </button>
                  </div>

                  {/* 3. High-frequency patients */}
                  <div
                    onClick={() => {
                      openActionModal(
                        'high-frequency',
                        'High-frequency patients',
                        analysisData?.patient_segments?.high_frequency?.count || 0,
                        analysisData?.patient_segments?.high_frequency?.patients || [],
                        'vip-reward',
                        'Send VIP reward'
                      );
                    }}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Star className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">High-frequency patients</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Protect</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analysisData?.patient_segments?.high_frequency?.count || 0} patients · ${(analysisData?.patient_segments?.high_frequency?.avg_ltv || 0).toLocaleString()} avg LTV
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(
                          'high-frequency',
                          'High-frequency patients',
                          analysisData?.patient_segments?.high_frequency?.count || 0,
                          analysisData?.patient_segments?.high_frequency?.patients || [],
                          'vip-reward',
                          'Send VIP reward'
                        );
                      }}
                      className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      VIP touchpoint
                    </button>
                  </div>

                  {/* 4. Referral champions */}
                  <div
                    onClick={() => {
                      openActionModal(
                        'referrers',
                        'Referral champions',
                        analysisData?.patient_segments?.referral_champions?.count || 0,
                        analysisData?.patient_segments?.referral_champions?.patients || [],
                        'referral-program',
                        'Launch referral program'
                      );
                    }}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">Referral champions</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Growth</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {analysisData?.patient_segments?.referral_champions?.count || 0} patients · {analysisData?.patient_segments?.referral_champions?.conversion_rate || 68}% conversion
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(
                          'referrers',
                          'Referral champions',
                          analysisData?.patient_segments?.referral_champions?.count || 0,
                          analysisData?.patient_segments?.referral_champions?.patients || [],
                          'referral-program',
                          'Launch referral program'
                        );
                      }}
                      className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      Activate
                    </button>
                  </div>

                  {/* 5. Cross-sell / Bundle opportunity */}
                  {analysisData?.service_analysis?.primary_opportunity && (
                    <>
                      {/* New three-segment bundle display */}
                      {analysisData.service_analysis.primary_opportunity.bundle_patients ? (
                        <div className="space-y-3">
                          {/* Header with insight */}
                          <div className="px-2">
                            <h4 className="font-medium text-gray-900 text-sm">{analysisData.service_analysis.primary_opportunity.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{analysisData.service_analysis.primary_opportunity.insight}</p>
                          </div>

                          {/* 1. Bundle patients (buy both) */}
                          {analysisData.service_analysis.primary_opportunity.bundle_patients.count > 0 && (
                            <div
                              onClick={() => {
                                openActionModal(
                                  'cross-sell',
                                  analysisData.service_analysis.primary_opportunity.bundle_patients.action,
                                  analysisData.service_analysis.primary_opportunity.bundle_patients.count,
                                  analysisData.service_analysis.primary_opportunity.bundle_patients.patients || [],
                                  'bundle',
                                  analysisData.service_analysis.primary_opportunity.bundle_patients.action,
                                  {
                                    newService: analysisData.service_analysis.primary_opportunity.services?.[1] || '',
                                    currentService: analysisData.service_analysis.primary_opportunity.services?.[0] || ''
                                  }
                                );
                              }}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                            >
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">Package deal</span>
                                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                                    Bundle
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {analysisData.service_analysis.primary_opportunity.bundle_patients.count} patients · ${analysisData.service_analysis.primary_opportunity.bundle_patients.potential?.toLocaleString()} potential
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openActionModal(
                                    'cross-sell',
                                    analysisData.service_analysis.primary_opportunity.bundle_patients.action,
                                    analysisData.service_analysis.primary_opportunity.bundle_patients.count,
                                    analysisData.service_analysis.primary_opportunity.bundle_patients.patients || [],
                                    'bundle',
                                    analysisData.service_analysis.primary_opportunity.bundle_patients.action,
                                    {
                                      newService: analysisData.service_analysis.primary_opportunity.services?.[1] || '',
                                      currentService: analysisData.service_analysis.primary_opportunity.services?.[0] || ''
                                    }
                                  );
                                }}
                                className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                              >
                                Offer discount
                              </button>
                            </div>
                          )}

                          {/* 2. Cross-sell A to B */}
                          {analysisData.service_analysis.primary_opportunity.crosssell_a_to_b?.count > 0 && (
                            <div
                              onClick={() => {
                                openActionModal(
                                  'cross-sell',
                                  analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.action,
                                  analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.count,
                                  analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.patients || [],
                                  'bundle',
                                  analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.action,
                                  {
                                    newService: analysisData.service_analysis.primary_opportunity.services?.[1] || '',
                                    currentService: analysisData.service_analysis.primary_opportunity.services?.[0] || ''
                                  }
                                );
                              }}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                            >
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <PlusCircle className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">{analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.action}</span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    Cross-sell
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.count} patients · ${analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.potential?.toLocaleString()} potential
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openActionModal(
                                    'cross-sell',
                                    analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.action,
                                    analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.count,
                                    analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.patients || [],
                                    'bundle',
                                    analysisData.service_analysis.primary_opportunity.crosssell_a_to_b.action,
                                    {
                                      newService: analysisData.service_analysis.primary_opportunity.services?.[1] || '',
                                      currentService: analysisData.service_analysis.primary_opportunity.services?.[0] || ''
                                    }
                                  );
                                }}
                                className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                              >
                                Launch
                              </button>
                            </div>
                          )}

                          {/* 3. Cross-sell B to A */}
                          {analysisData.service_analysis.primary_opportunity.crosssell_b_to_a?.count > 0 && (
                            <div
                              onClick={() => {
                                openActionModal(
                                  'cross-sell',
                                  analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.action,
                                  analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.count,
                                  analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.patients || [],
                                  'bundle',
                                  analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.action,
                                  {
                                    newService: analysisData.service_analysis.primary_opportunity.services?.[0] || '',
                                    currentService: analysisData.service_analysis.primary_opportunity.services?.[1] || ''
                                  }
                                );
                              }}
                              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                            >
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <PlusCircle className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">{analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.action}</span>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    Cross-sell
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.count} patients · ${analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.potential?.toLocaleString()} potential
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openActionModal(
                                    'cross-sell',
                                    analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.action,
                                    analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.count,
                                    analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.patients || [],
                                    'bundle',
                                    analysisData.service_analysis.primary_opportunity.crosssell_b_to_a.action,
                                    {
                                      newService: analysisData.service_analysis.primary_opportunity.services?.[0] || '',
                                      currentService: analysisData.service_analysis.primary_opportunity.services?.[1] || ''
                                    }
                                  );
                                }}
                                className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                              >
                                Launch
                              </button>
                            </div>
                          )}

                          {/* Total potential */}
                          {analysisData.service_analysis.primary_opportunity.potential_revenue && (
                            <p className="text-xs text-gray-400 text-center">
                              Total potential: ${analysisData.service_analysis.primary_opportunity.potential_revenue.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Legacy single-card display for backward compatibility */
                        <div
                          onClick={() => {
                            openActionModal(
                              'cross-sell',
                              analysisData.service_analysis.primary_opportunity.title,
                              analysisData.service_analysis.primary_opportunity.patient_count,
                              analysisData.service_analysis.primary_opportunity.patients || [],
                              'bundle',
                              analysisData.service_analysis.primary_opportunity.cta,
                              {
                                newService: analysisData.service_analysis.primary_opportunity.category || 'skincare',
                                currentService: 'injectable treatments'
                              }
                            );
                          }}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer flex items-center gap-4"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Target className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {analysisData.service_analysis.primary_opportunity.title}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                {analysisData.service_analysis.primary_opportunity.type === 'bundle' ? 'Bundle' : 'Upsell'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {analysisData.service_analysis.primary_opportunity.patient_count} patients · ${analysisData.service_analysis.primary_opportunity.potential_revenue?.toLocaleString()} potential
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openActionModal(
                                'cross-sell',
                                analysisData.service_analysis.primary_opportunity.title,
                                analysisData.service_analysis.primary_opportunity.patient_count,
                                analysisData.service_analysis.primary_opportunity.patients || [],
                                'bundle',
                                analysisData.service_analysis.primary_opportunity.cta,
                                {
                                  newService: analysisData.service_analysis.primary_opportunity.category || 'skincare',
                                  currentService: 'injectable treatments'
                                }
                              );
                            }}
                            className="w-32 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                          >
                            {analysisData.service_analysis.primary_opportunity.cta?.split(' ').slice(0, 2).join(' ') || 'Launch'}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                  Click a row to see patients and next steps
                </p>
              </div>
            </section>
          )}


          {/* ================================================================ */}
          {/* MORTGAGE: EVIDENCE CARDS (existing)                            */}
          {/* ================================================================ */}
          {isMortgage && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Protect · Get them back
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Action items for this week
              </span>
            </div>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-5">
                    {/* MORTGAGE CARD 1 - Your next move */}
                    <article className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-[#111827]">Your next move</h3>
                      </div>
                      <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                        <span className="font-bold text-[#111827]">{analysisData?.preapproval_metrics?.stale_count || 0}</span> stale pre-approvals.
                        {analysisData?.preapproval_metrics?.top_by_loan_amount?.length > 0 
                          ? <> Your top <span className="font-bold text-[#111827]">{Math.min(analysisData.preapproval_metrics.top_by_loan_amount.length, 5)}</span> by loan amount are worth <span className="font-bold text-[#111827]">${((analysisData.preapproval_metrics.top_by_loan_amount.slice(0, 5).reduce((sum: number, b: any) => sum + (b.commission || 4000), 0)) / 1000).toFixed(0)}K</span> in commission — start there.</>
                          : ` Sort by loan amount — your biggest loans are worth the most commission.`
                        }
                      </p>
                      
                      <div className="text-sm mb-4">
                        <div className="font-medium text-[#111827] mb-2">Today's call list:</div>
                        <div className="space-y-2">
                          {analysisData?.preapproval_metrics?.top_by_loan_amount?.slice(0, 3).map((borrower: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                              <span className="font-bold text-[#111827]">{borrower.name || `Borrower ${idx + 1}`}</span>
                              <div className="text-right">
                                <span className="font-bold text-[#111827]">${((borrower.loan_amount || 0) / 1000).toFixed(0)}K</span>
                                <span className="text-[#6B7280]"> loan</span>
                                {borrower.days_stale && <span className="text-[#9CA3AF] text-xs ml-2">({borrower.days_stale} days)</span>}
                              </div>
                            </div>
                          )) || (
                            <>
                              <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-[#9CA3AF]">1. _____________</span>
                                <span className="text-[#9CA3AF]">$___K loan</span>
                              </div>
                              <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-[#9CA3AF]">2. _____________</span>
                                <span className="text-[#9CA3AF]">$___K loan</span>
                              </div>
                              <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-[#9CA3AF]">3. _____________</span>
                                <span className="text-[#9CA3AF]">$___K loan</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-[#111827] bg-indigo-50 rounded-lg p-3">
                        <div className="font-medium mb-1">Text template for the rest:</div>
                        <p className="text-[#6B7280] italic">"Hey [name], it's [you]. Rates are at [X.X]% — your $[loan] pre-approval could save you $[amount]/mo. Worth 5 mins this week?"</p>
                      </div>
                    </article>

                    {/* MORTGAGE CARD 2 - How to open the call */}
                    <article className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                          <Target className="h-4 w-4 text-indigo-600" />
                        </div>
                        <h3 className="font-semibold text-[#111827]">How to open the call</h3>
                      </div>
                      <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                        Use their name and reference something specific. Pick the line that fits:
                      </p>
                      <div className="space-y-3 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-[#111827] mb-1">Check-in opener:</div>
                          <p className="text-[#6B7280]">"Hey <span className="font-bold text-[#111827]">[name]</span>, last time we talked you were looking at places in <span className="font-bold text-[#111827]">[area]</span>. Still searching, or did you find something?"</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-[#111827] mb-1">Rate update opener:</div>
                          <p className="text-[#6B7280]">"Hey <span className="font-bold text-[#111827]">[name]</span>, your pre-approval is <span className="font-bold text-[#111827]">{analysisData?.preapproval_metrics?.avg_days_stale ? Math.round(analysisData.preapproval_metrics.avg_days_stale) : '[X]'} days</span> old — rates have moved since then. Want me to re-run your numbers?"</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="font-medium text-[#111827] mb-1">Direct opener:</div>
                          <p className="text-[#6B7280]">"Hey <span className="font-bold text-[#111827]">[name]</span>, quick check on your <span className="font-bold text-[#111827]">${analysisData?.preapproval_metrics?.avg_loan_amount ? ((analysisData.preapproval_metrics.avg_loan_amount) / 1000).toFixed(0) + 'K' : '[loan]'}</span> pre-approval. Still good to go, or did something change?"</p>
                        </div>
                      </div>
                    </article>

                    {/* MORTGAGE CARD 3 - The math */}
                    <article className="bg-white rounded-xl p-6 shadow-sm border border-[#E5E7EB]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-[#111827]">What's at stake</h3>
                      </div>
                      <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                        {(analysisData?.preapproval_metrics?.commission_at_risk || 0) > 100000
                          ? <><span className="font-bold text-[#111827]">${((analysisData?.preapproval_metrics?.commission_at_risk || 0) / 1000).toFixed(0)}K</span> in commission sitting in stale files. That's real money — treat this as priority #1 this week.</>
                          : (analysisData?.preapproval_metrics?.commission_at_risk || 0) > 50000
                          ? <><span className="font-bold text-[#111827]">${((analysisData?.preapproval_metrics?.commission_at_risk || 0) / 1000).toFixed(0)}K</span> tied up in borrowers who went quiet. A few hours of focused calls could recover <span className="font-bold text-[#111827]">${((analysisData?.preapproval_metrics?.commission_at_risk || 0) * 0.2 / 1000).toFixed(0)}K</span>.</>
                          : <><span className="font-bold text-[#111827]">${((analysisData?.preapproval_metrics?.commission_at_risk || 0) / 1000).toFixed(0)}K</span> in stale pipeline. Quick wins here — a few calls could close 1-2 deals.</>
                        }
                      </p>
                      <div className="text-sm bg-emerald-50 rounded-lg p-3">
                        <div className="font-medium text-[#111827] mb-2">The math:</div>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-[#6B7280]">
                          <div>Stale pre-approvals:</div>
                          <div className="font-bold text-[#111827]">{analysisData?.preapproval_metrics?.stale_count || 0}</div>
                          <div>× 20% recovery rate:</div>
                          <div className="font-bold text-[#111827]">{Math.round((analysisData?.preapproval_metrics?.stale_count || 0) * 0.2)} deals</div>
                          <div>× avg commission:</div>
                          <div className="font-bold text-[#111827]">${analysisData?.preapproval_metrics?.avg_commission ? (analysisData.preapproval_metrics.avg_commission / 1000).toFixed(1) + 'K' : '4K'}</div>
                          <div className="font-medium text-[#111827] pt-2 border-t border-emerald-200">Potential recovery:</div>
                          <div className="font-bold text-emerald-700 pt-2 border-t border-emerald-200">${((analysisData?.preapproval_metrics?.stale_count || 0) * 0.2 * (analysisData?.preapproval_metrics?.avg_commission || 4000) / 1000).toFixed(0)}K</div>
                        </div>
                      </div>
                    </article>
              </div>
            </div>
          </section>
          )}




          {/* STEP 1: PRIMARY ACTION - Mortgage only */}
          {isMortgage && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                Step 1 · Reach out this week
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Start here if you only do one thing this month.
              </span>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-[#E5E7EB]">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#111827]">
                    Call these borrowers back
                  </h3>
                  <p className="text-sm md:text-base text-[#6B7280] leading-relaxed max-w-xl">
                    {analysisData?.preapproval_metrics?.stale_count || 0} of your best borrowers have gone quiet. They're still in the market — but they won't wait forever. A quick check-in now could save ${((analysisData?.preapproval_metrics?.commission_at_risk || 0) / 1000).toFixed(0)}K in commission.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      const atRiskPatients = (analysisData?.preapproval_metrics?.top_by_loan_amount || []).map((b: any) => ({
                            patient_id: b.borrower_id || b.name,
                            days_overdue: b.days_stale,
                            disc_type: b.disc_type,
                            loan_amount: b.loan_amount,
                            commission: b.commission,
                            name: b.name
                          }));
                      const patientIds = atRiskPatients.map((p: any) => p.patient_id);
                      if (patientIds.length > 0) {
                        markContacted(patientIds, atRiskPatients);
                        setWinbackPatients(atRiskPatients);
                        setShowWinbackModal(true);
                      } else {
                        generateCampaign();
                      }
                    }}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#6366f1] text-white text-sm md:text-base font-semibold shadow-md hover:bg-[#4f46e5] transition-colors disabled:opacity-50"
                  >
                    Get call list + scripts
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="text-xs md:text-sm text-[#6B7280] max-w-md">
                    Scripts and talking points ready. Just open, call, close.
                  </p>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* RECOVERY ANALYTICS - Mortgage only, only show if data exists */}
          {isMortgage && recoveryAnalytics?.buckets?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  Your Recovery Data
                </h2>
                <span className="text-[11px] text-[#9CA3AF]">
                  What happens when you call faster
                </span>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
                <div className="space-y-4">
                  {recoveryAnalytics.buckets.map((bucket: any, idx: number) => {
                    const maxConversion = Math.max(...recoveryAnalytics.buckets.map((b: any) => b.conversion_rate || 0), 1);
                    const barWidth = ((bucket.conversion_rate || 0) / maxConversion) * 100;
                    const barColor = idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-amber-500' : idx === 2 ? 'bg-orange-500' : 'bg-red-400';
                    const textColor = idx === 0 ? 'text-emerald-600' : idx === 1 ? 'text-amber-600' : idx === 2 ? 'text-orange-600' : 'text-red-500';
                    
                    return (
                      <div key={bucket.timing} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium text-[#374151]">{bucket.timing}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                        </div>
                        <div className="w-16 text-right">
                          <span className={`text-lg font-bold ${textColor}`}>{bucket.conversion_rate}%</span>
                        </div>
                        <div className="w-16 text-right text-xs text-[#9CA3AF]">
                          {bucket.closed}/{bucket.total}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Insight callout */}
                {recoveryAnalytics.buckets.length >= 2 && recoveryAnalytics.buckets[0].conversion_rate > 0 && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">
                          Calling within 7 days = {(recoveryAnalytics.buckets[0].conversion_rate / (recoveryAnalytics.buckets[recoveryAnalytics.buckets.length - 1].conversion_rate || 1)).toFixed(1)}x better close rate
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          You have {analysisData?.preapproval_metrics?.stale_count || 0} pre-approvals that need attention right now
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Summary stats */}
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      ${((recoveryAnalytics.buckets.reduce((sum: number, b: any) => sum + (b.revenue_recovered || 0), 0)) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Recovered</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {recoveryAnalytics.buckets.reduce((sum: number, b: any) => sum + (b.closed || 0), 0)}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Closed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#111827]">
                      {recoveryAnalytics.buckets.reduce((sum: number, b: any) => sum + (b.total || 0), 0)}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Contacted</div>
                  </div>
                </div>
              </div>
            </section>
          )}
          
          {/* ROI TRACKING */}
          {outreachSummary && outreachSummary.contacted_count > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  Where is your $10K working?
                </h2>
                <span className="text-[11px] text-[#9CA3AF]">
                  Channel performance from your data
                </span>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
                {analysisData?.channel_roi && Object.entries(analysisData.channel_roi).filter(([_, data]: [string, any]) => data.leads > 0 || data.funded > 0).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(analysisData.channel_roi).filter(([_, data]: [string, any]) => data.leads > 0 || data.funded > 0).map(([source, data]: [string, any]) => (
                      <div key={source} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="font-medium text-[#111827] capitalize">{source.replace(/_/g, ' ')}</div>
                        <div className="flex items-center gap-6">
                          <div className="text-right min-w-[60px]">
                            <div className="text-[#6B7280]">Leads</div>
                            <div className="font-bold text-[#111827]">{data.leads || 0}</div>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <div className="text-[#6B7280]">Funded</div>
                            <div className="font-bold text-emerald-600">{data.funded || 0}</div>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <div className="text-[#6B7280]">ROI</div>
                            <div className={`font-bold ${data.roi > 2 ? 'text-emerald-600' : data.roi > 1 ? 'text-amber-600' : 'text-red-600'}`}>
                              {data.roi ? `${data.roi.toFixed(1)}x` : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B7280] text-center py-4">
                    Add a "source" or "lead_source" column to your CSV to see channel breakdown.
                  </p>
                )}
              </div>
            </section>
          )}


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
                        Up {analysisData?.behavior_patterns?.spend_change_pct || 8}% year-over-year. {terms.Customers} are choosing premium
                        services when they do visit.
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                        Retention Rate
                      </div>
                      <div className="text-2xl font-semibold text-[#111827] mb-1">
                        {analysisData?.behavior_patterns?.retention_rate || 73}%
                      </div>
                      <p className="text-sm text-[#6B7280]">
                        12-month retention. Market average is 58%, so you're
                        outperforming by {Math.abs((analysisData?.behavior_patterns?.retention_rate || 73) - 58)} percentage points.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-white rounded-lg border border-[#E5E7EB]">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">
                      Top Services
                    </div>
                    <div className="space-y-2">
                      {(
                        analysisData?.behavior_patterns?.top_treatments || [
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
                              {(analysisData?.behavior_patterns?.top_treatments_pct?.[idx] ?? [42, 28, 18][idx])}% of visits
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
                      <div className="text-2xl font-semibold text-[#6366f1] mb-1">
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
                            className="bg-[#6366f1] h-2 rounded-full"
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
                            className="bg-[#6366f1] h-2 rounded-full"
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
                            className="bg-[#6366f1] h-2 rounded-full"
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

            {/* SMS Campaign History */}
            {smsCampaigns.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <button
                onClick={() => toggleAccordion("sms")}
                className="w-full px-6 md:px-8 py-5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-base md:text-lg font-semibold text-[#111827]">Campaign History</h3>
                  <p className="text-xs md:text-sm text-[#6B7280] mt-1">{smsCampaigns.length} campaigns sent</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-[#6B7280] transition-transform ${openAccordions["sms"] ? "rotate-180" : ""}`} />
              </button>
              {openAccordions["sms"] && (
                <div className="px-6 md:px-8 py-6 border-t border-[#E5E7EB] bg-[#F9FAFB] space-y-4">
                  {smsCampaigns.map((c) => (
                    <div key={c.id} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "Not sent"}</div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{c.segment}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div><div className="text-lg font-semibold">{c.sent_count}</div><div className="text-[10px] text-gray-500">Sent</div></div>
                        <div><div className="text-lg font-semibold text-green-600">{c.delivered_count || 0}</div><div className="text-[10px] text-gray-500">Delivered</div></div>
                        <div><div className="text-lg font-semibold text-red-500">{c.failed_count}</div><div className="text-[10px] text-gray-500">Failed</div></div>
                        <div><div className="text-lg font-semibold text-indigo-600">{c.sent_count > 0 ? ((c.conversions || 0) / c.sent_count * 100).toFixed(1) : 0}%</div><div className="text-[10px] text-gray-500">Converted</div></div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm"><span className="font-medium text-green-600">{c.conversions || 0}</span> bookings</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => recordConversion(c.id, -1)} disabled={(c.conversions || 0) <= 0} className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">−</button>
                          <span className="w-6 text-center font-medium">{c.conversions || 0}</span>
                          <button onClick={() => recordConversion(c.id, 1)} className="h-7 w-7 flex items-center justify-center rounded bg-green-50 border border-green-200 hover:bg-green-100 text-green-700">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
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
                              className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
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
                                className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
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
                            <td className="py-3 px-6 text-right font-semibold text-[#6366f1]">
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
                              className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
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
                                className="rounded border-[#CBD5E1] text-[#6366f1] focus:ring-[#6366f1]"
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
                            <td className="py-3 px-6 text-right font-semibold text-[#6366f1]">
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

          {/* ================================================================ */}
          {/* KPI BAND - The payoff (moved to end)                            */}
          {/* Dark band feels like a natural conclusion                        */}
          {/* ================================================================ */}
          {!isMortgage && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                What this plan could deliver
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">
                Segment-specific ROI projections
              </span>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200">
              {(() => {
                // Calculate segment-specific ROI projections
                const oneAndDone = analysisData?.patient_segments?.one_and_done;
                const lapsedRegulars = analysisData?.patient_segments?.lapsed_regulars;
                const highFrequency = analysisData?.patient_segments?.high_frequency;
                const referralChampions = analysisData?.patient_segments?.referral_champions;

                // Assumptions based on industry benchmarks
                const winBackRate = 0.15; // 15% win-back rate for one-and-done
                const retentionSaveRate = 0.60; // 60% of at-risk can be saved with outreach
                const referralActivationRate = 0.30; // 30% of champions will refer if asked
                const avgReferralValue = 450; // Average value of a referred patient

                // Calculate projected impacts
                const oneAndDoneRecovery = Math.round((oneAndDone?.count || 0) * winBackRate * (oneAndDone?.avg_spend || 0));
                const lapsedProtected = Math.round((lapsedRegulars?.count || 0) * retentionSaveRate * (lapsedRegulars?.avg_ltv || 0));
                const referralRevenue = Math.round((referralChampions?.count || 0) * referralActivationRate * avgReferralValue);
                const totalPotential = oneAndDoneRecovery + lapsedProtected + referralRevenue;

                const projections = [
                  {
                    action: `Win back ${Math.round((oneAndDone?.count || 0) * winBackRate)} of ${oneAndDone?.count || 0} one-and-done patients`,
                    assumption: '15% win-back rate',
                    impact: oneAndDoneRecovery,
                    type: 'recovered',
                    color: 'text-rose-600',
                    bgColor: 'bg-rose-50',
                  },
                  {
                    action: `Retain ${Math.round((lapsedRegulars?.count || 0) * retentionSaveRate)} of ${lapsedRegulars?.count || 0} lapsed regulars`,
                    assumption: '60% save rate with outreach',
                    impact: lapsedProtected,
                    type: 'protected',
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                  },
                  {
                    action: `Activate ${Math.round((referralChampions?.count || 0) * referralActivationRate)} referrals from ${referralChampions?.count || 0} champions`,
                    assumption: '30% activation rate',
                    impact: referralRevenue,
                    type: 'new revenue',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                  },
                ];

                return (
                  <div className="space-y-4">
                    {/* Projection rows */}
                    <div className="space-y-3">
                      {projections.map((proj, index) => (
                        <div key={index} className={`${proj.bgColor} rounded-xl p-4 flex items-center justify-between`}>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{proj.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Based on {proj.assumption}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-lg font-bold ${proj.color}`}>
                              +${proj.impact.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">{proj.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-gray-200 pt-4 mt-4">
                      <div className="bg-gray-900 rounded-xl p-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-300">Total potential if you execute all three</p>
                          <p className="text-xs text-gray-500 mt-1">These are projections based on industry benchmarks, not guarantees</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            ${totalPotential.toLocaleString()}
                          </p>
                          <p className="text-xs text-emerald-400">annual impact</p>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-gray-400 text-center mt-4">
                      Projections improve as we learn from your actual campaign results
                    </p>
                  </div>
                );
              })()}
            </div>
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
                className="w-full px-10 py-4 text-base md:text-lg font-semibold text-white bg-[#6366f1] rounded-xl hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-colors"
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

    {/* Retention Action Modal */}
    {showActionModal && actionModalData && (
      <CampaignWorkflowModal
        actionModalData={actionModalData}
        analysisData={analysisData}
        runId={currentRunId}
        onClose={() => setShowActionModal(false)}
        onExportCSV={handleExportCSV}
      />
    )}

    {showWinbackModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {isMortgage ? 'Pre-Approval Recapture Scripts' : 'Win-Back Campaign Scripts'}
              </h2>
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

                {/* Communication Coaching - Mortgage only */}
                {isMortgage && (
                  <div className="space-y-3 border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900">🎯 Match your approach to the borrower</h3>
                    <p className="text-xs text-gray-500">Different people need different approaches. Use what you know about them.</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-lg p-3 bg-red-50 border border-red-200">
                        <div className="font-medium text-gray-900 mb-1">If they seem busy or direct</div>
                        <p className="text-sm text-gray-600">"Quick question — still looking, or did you find something?"</p>
                      </div>
                      <div className="rounded-lg p-3 bg-yellow-50 border border-yellow-200">
                        <div className="font-medium text-gray-900 mb-1">If they liked chatting last time</div>
                        <p className="text-sm text-gray-600">"Hey! How's the house hunt going? Anything new since we talked?"</p>
                      </div>
                      <div className="rounded-lg p-3 bg-green-50 border border-green-200">
                        <div className="font-medium text-gray-900 mb-1">If they seemed nervous or unsure</div>
                        <p className="text-sm text-gray-600">"Just checking in — any questions I can help clear up?"</p>
                      </div>
                      <div className="rounded-lg p-3 bg-indigo-50 border border-indigo-200">
                        <div className="font-medium text-gray-900 mb-1">If they wanted all the details</div>
                        <p className="text-sm text-gray-600">"I ran your numbers against today's rates — got 3 mins to compare?"</p>
                      </div>
                    </div>
                  </div>
                )}

                {winbackScripts?.source === 'optimized' && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span> Using top-performing templates
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">{terms.Customers} to Contact ({winbackPatients.length})</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {winbackPatients.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-sm border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{p.patient_id || `${terms.Customer} ${idx + 1}`}</span>
                          {isMortgage && p.disc_type && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.disc_type === 'D' ? 'bg-red-100 text-red-700' :
                              p.disc_type === 'I' ? 'bg-yellow-100 text-yellow-700' :
                              p.disc_type === 'S' ? 'bg-green-100 text-green-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>{p.disc_type}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-red-600 text-xs">{p.days_overdue} days</span>
                          <select
                            value={outcomes[p.patient_id] || 'pending'}
                            onChange={(e) => updateOutcome(p.patient_id, e.target.value)}
                            className={`text-xs border rounded px-2 py-1 ${
                              outcomes[p.patient_id] === 'closed' ? 'bg-green-50 border-green-300' :
                              outcomes[p.patient_id] === 'lost' ? 'bg-red-50 border-red-300' :
                              'bg-white border-gray-200'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="no_answer">No Answer</option>
                            <option value="callback">Callback</option>
                            <option value="closed">Closed ✓</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
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
    {showSMSModal && actionModalData && (
      <SMSSendModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        segment={actionModalData.segment}
        segmentLabel={actionModalData.title}
        patientCount={actionModalData.count}
        message={dynamicCopy?.sms || ""}
        recipients={actionModalData.patients.filter(p => typeof p === "object" && p.phone && String(p.phone).trim() !== "").map(p => typeof p === "object" ? {patient_id: p.patient_id, name: p.name, phone: String(p.phone || "")} : {patient_id: p, phone: ""})}
        runId={currentRunId || undefined}
      />
    )}
    </>
  );
}// Tue Dec 30 05:42:11 CST 2025
// Wed Dec 31 03:47:13 CST 2025
