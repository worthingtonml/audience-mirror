// types.ts

export type KeyInsightType = 'campaign_win' | 'benchmark' | 'milestone';
export type ActionableInsightType = 'market_signal' | 'timing' | 'urgent';
export type InsightType = KeyInsightType | ActionableInsightType;

export interface BaseInsight {
  id: string;
  type: InsightType;
  headline: string;
  subtext?: string;
}

export interface KeyInsight extends BaseInsight {
  type: KeyInsightType;
  metric: string;
  metricLabel: string;
  supportingStat?: string;
}

export interface ActionableInsight extends BaseInsight {
  type: ActionableInsightType;
  cta: string;
  anchor: string; // Route or element ID to navigate to
}

export type Insight = KeyInsight | ActionableInsight;

export const isKeyInsight = (insight: Insight): insight is KeyInsight => {
  return ['campaign_win', 'benchmark', 'milestone'].includes(insight.type);
};

export const isActionableInsight = (insight: Insight): insight is ActionableInsight => {
  return ['market_signal', 'timing', 'urgent'].includes(insight.type);
};

export const INSIGHT_CONFIG = {
  campaign_win: {
    label: 'Key Insight',
    accentColor: 'emerald' as const,
    icon: 'trending-up' as const,
  },
  benchmark: {
    label: 'Key Insight',
    accentColor: 'blue' as const,
    icon: 'bar-chart' as const,
  },
  milestone: {
    label: 'Milestone',
    accentColor: 'amber' as const,
    icon: 'sparkles' as const,
  },
  market_signal: {
    label: 'Market Signal',
    accentColor: 'violet' as const,
    icon: 'users' as const,
  },
  timing: {
    label: 'Timing',
    accentColor: 'rose' as const,
    icon: 'calendar' as const,
  },
  urgent: {
    label: 'Urgent',
    accentColor: 'amber' as const,
    icon: 'alert-triangle' as const,
  },
} as const;
