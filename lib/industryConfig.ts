// lib/industryConfig.ts

export interface DISCType {
  label: string;
  tone: string;
  hooks: string[];
  avoid: string[];
}

export interface HeroMetric {
  key: string;
  label: string;
  formula: (data: any) => number | string;
  format: 'currency' | 'percent' | 'multiplier' | 'number';
  subtext?: string;
}

export interface Step1Config {
  key: string;
  title: string;
  description: (data: any) => string;
  ctaLabel: string;
  queryKey: string;
}

export interface Step2Card {
  key: string;
  title: string;
  description: (data: any) => string;
  ctaLabel: string;
  metrics?: string[];
}

export interface IndustryConfig {
  key: string;
  label: string;
  entityLabels: {
    singular: string;
    plural: string;
    possessive: string;
  };
  heroMetrics: HeroMetric[];
  atRiskConfig: {
    cycleDays: number;
    preapprovalStaleDays?: number;
    criticalMultiplier: number;
    label: string;
  };
  step1: Step1Config;
  step2: {
    cards: Step2Card[];
  };
  roiConfig: {
    successEventTypes: string[];
    revenueField: string;
    label: string;
    channelTracking?: boolean;
  };
  scriptConfig: {
    useDISC: boolean;
    discTypes?: Record<string, DISCType>;
    segments: string[];
  };
}

export const DISC_TYPES: Record<string, DISCType> = {
  D: {
    label: 'Dominant',
    tone: 'Direct, bottom-line, no fluff',
    hooks: ['Skip the small talk', 'Lead with numbers', 'Give them control'],
    avoid: ['Over-explaining', 'Emotional appeals', 'Long preambles']
  },
  I: {
    label: 'Influencer',
    tone: 'Warm, enthusiastic, relationship-first',
    hooks: ['Personal connection', 'Excitement about their goals', 'Social proof'],
    avoid: ['Too many details upfront', 'Being transactional', 'Rushing']
  },
  S: {
    label: 'Steady',
    tone: 'Patient, reassuring, step-by-step',
    hooks: ["We'll go at your pace", "Here's exactly what happens next", "I'm here throughout"],
    avoid: ['Pressure tactics', 'Rushing decisions', 'Ambiguity']
  },
  C: {
    label: 'Conscientious',
    tone: 'Detailed, accurate, data-driven',
    hooks: ['Here are the exact numbers', 'Let me walk you through the comparison', 'Documentation ready'],
    avoid: ['Vague answers', 'Emotional appeals', 'Skipping details']
  }
};

export const mortgageConfig: IndustryConfig = {
  key: 'mortgage',
  label: 'Mortgage',
  entityLabels: {
    singular: 'borrower',
    plural: 'borrowers',
    possessive: "borrower's"
  },
  heroMetrics: [
    {
      key: 'stalePreapprovals',
      label: 'Pre-Approvals Going Cold',
      formula: (d) => d.preapproval_metrics?.stale_count || 0,
      format: 'number',
      subtext: '60+ days, no activity'
    },
    {
      key: 'avgDaysToClose',
      label: 'Avg Days to Close',
      formula: (d) => d.funnel_metrics?.avg_days_to_close || 0,
      format: 'number',
      subtext: 'from pre-approval'
    },
    {
      key: 'commissionAtRisk',
      label: 'Commission at Risk',
      formula: (d) => d.churn?.at_risk_revenue || 0,
      format: 'currency',
      subtext: 'from stale pipeline'
    },
    {
      key: 'databaseDrift',
      label: 'Database Going Cold',
      formula: (d) => d.churn?.at_risk_percent || 0,
      format: 'percent',
      subtext: 'no touch 12+ months'
    },
  ],
  atRiskConfig: {
    cycleDays: 365,
    preapprovalStaleDays: 60,
    criticalMultiplier: 1.5,
    label: 'Commission at Risk'
  },
  step1: {
    key: 'recapture_preapprovals',
    title: 'Recapture shopping pre-approvals',
    description: (d) => `${d.stalePreapprovals || 0} pre-approvals are 60+ days old with no activity. They're shopping. Reach out before they close with someone else.`,
    ctaLabel: 'Launch recapture',
    queryKey: 'stale_preapprovals'
  },
  step2: {
    cards: [
      {
        key: 'channel_roi',
        title: 'Where is your $10K working?',
        description: (d) => `See which channels actually close. Stop spending blind.`,
        ctaLabel: 'View channel ROI',
        metrics: ['conversion_by_source', 'cost_per_funded', 'roi_by_channel']
      },
      {
        key: 'database_reactivation',
        title: 'Wake up your database',
        description: (d) => `${d.coldDatabaseCount || 0} past borrowers haven't heard from you in 12+ months. Refi windows are opening.`,
        ctaLabel: 'Launch re-engagement'
      },
    ],
  },
  roiConfig: {
    successEventTypes: ['funded_loan', 'application_submitted', 'preapproval_renewed'],
    revenueField: 'commission',
    label: 'Commission Recovered',
    channelTracking: true
  },
  scriptConfig: {
    useDISC: true,
    discTypes: DISC_TYPES,
    segments: [
      'first_time_buyer',
      'repeat_borrower',
      'investor',
      'credit_repair',
      'stale_preapproval',
      'refi_window',
      'builder_referral',
      'realtor_referral'
    ]
  }
};

export const realEstateConfig: IndustryConfig = {
  key: 'real_estate',
  label: 'Real Estate',
  entityLabels: {
    singular: 'client',
    plural: 'clients',
    possessive: "client's"
  },
  heroMetrics: [
    {
      key: 'avgCommission',
      label: 'Avg Commission/Client',
      formula: (d) => d.behavior_patterns?.avg_lifetime_value || 0,
      format: 'currency',
      subtext: 'lifetime value'
    },
    {
      key: 'dealFrequency',
      label: 'Deal Frequency',
      formula: (d) => d.behavior_patterns?.avg_visits_per_year || 0,
      format: 'multiplier',
      subtext: 'transactions/client'
    },
    {
      key: 'commissionAtRisk',
      label: 'Commission at Risk',
      formula: (d) => d.churn?.at_risk_revenue || 0,
      format: 'currency',
      subtext: 'from cold sphere'
    },
    {
      key: 'sphereDrift',
      label: 'Sphere Going Cold',
      formula: (d) => d.churn?.at_risk_percent || 0,
      format: 'percent',
      subtext: 'no touch 2+ years'
    },
  ],
  atRiskConfig: {
    cycleDays: 730,
    criticalMultiplier: 1.5,
    label: 'Commission at Risk'
  },
  step1: {
    key: 're_engage_sphere',
    title: 'Re-engage your sphere',
    description: (d) => `${d.atRiskCount || 0} past clients haven't heard from you in 2+ years. They're about to forget you.`,
    ctaLabel: 'Launch re-engagement',
    queryKey: 'cold_sphere'
  },
  step2: {
    cards: [
      {
        key: 'farm_new_zips',
        title: 'Farm new neighborhoods',
        description: (d) => `Find lookalike ZIPs where your best clients live.`,
        ctaLabel: 'See farming areas'
      },
      {
        key: 'referral_activation',
        title: 'Activate referrals',
        description: (d) => `${d.referralRate || 18}% have referred before. Ask for intros.`,
        ctaLabel: 'Launch referral ask'
      },
    ],
  },
  roiConfig: {
    successEventTypes: ['closed_deal', 'listing', 'referral_received'],
    revenueField: 'commission',
    label: 'Commission Recovered',
    channelTracking: true
  },
  scriptConfig: {
    useDISC: true,
    discTypes: DISC_TYPES,
    segments: [
      'first_time_buyer',
      'repeat_seller',
      'investor',
      'long_cold_sphere',
      'recent_close_referral_ask',
      'relocation'
    ]
  }
};

export const medspaConfig: IndustryConfig = {
  key: 'medspa',
  label: 'Aesthetics',
  entityLabels: {
    singular: 'patient',
    plural: 'patients',
    possessive: "patient's"
  },
  heroMetrics: [
    {
      key: 'ltv',
      label: 'Avg Lifetime Value',
      formula: (d) => d.behavior_patterns?.avg_lifetime_value || 0,
      format: 'currency',
      subtext: 'per patient'
    },
    {
      key: 'frequency',
      label: 'Visit Frequency',
      formula: (d) => d.behavior_patterns?.avg_visits_per_year || 0,
      format: 'multiplier',
      subtext: 'per year'
    },
    {
      key: 'revenueAtRisk',
      label: 'Revenue at Risk',
      formula: (d) => d.churn?.at_risk_revenue || 0,
      format: 'currency',
      subtext: 'from lapsed patients'
    },
    {
      key: 'churnRate',
      label: 'Churn Rate',
      formula: (d) => d.churn?.at_risk_percent || 0,
      format: 'percent',
      subtext: 'overdue for visit'
    },
  ],
  atRiskConfig: {
    cycleDays: 90,
    criticalMultiplier: 2,
    label: 'Revenue at Risk'
  },
  step1: {
    key: 'win_back_lapsed',
    title: 'Win back lapsed patients',
    description: (d) => `${d.atRiskCount || 0} patients haven't returned within their expected interval. Launch a reactivation offer.`,
    ctaLabel: 'Set up now',
    queryKey: 'at_risk_patients'
  },
  step2: {
    cards: [
      {
        key: 'expand_zips',
        title: 'Expand to new ZIPs',
        description: (d) => `Target adjacent neighborhoods with similar demographics.`,
        ctaLabel: 'See expansion ZIPs'
      },
      {
        key: 'upsell',
        title: 'Increase spend per visit',
        description: (d) => `Bundle treatments to lift average ticket.`,
        ctaLabel: 'Create bundle'
      },
    ],
  },
  roiConfig: {
    successEventTypes: ['visit', 'treatment', 'booking'],
    revenueField: 'revenue',
    label: 'Revenue Recovered',
    channelTracking: false
  },
  scriptConfig: {
    useDISC: false,
    segments: [
      'new_patient',
      'lapsed_vip',
      'regular_maintenance',
      'high_value',
      'at_risk'
    ]
  }
};

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  medspa: medspaConfig,
  mortgage: mortgageConfig,
  real_estate: realEstateConfig,
  real_estate_mortgage: mortgageConfig,
};

export function getIndustryConfig(vertical: string): IndustryConfig {
  return INDUSTRY_CONFIGS[vertical] || medspaConfig;
}

export function formatMetricValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(0)}`;
    case 'percent':
      return `${value.toFixed(0)}%`;
    case 'multiplier':
      return `${value.toFixed(1)}×`;
    case 'number':
    default:
      return value.toFixed(0);
  }
}