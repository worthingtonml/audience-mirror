export type BehavioralTag = string | { label: string; color?: string };

export interface Segment {
  zip: string;
  area: string;
  match_score: number;
  cohort: string;
  distance_miles: number;
  competitors: number;
  expected_bookings: {
    p10: number;
    p50: number;
    p90: number;
  };
  strategic_insights?: string[];
  recommended_platform?: string;

  // New fields from backend
  location_name?: string;
  competition_level?: string;
  monthly_revenue_potential?: number;
  demographic_description?: string;
  behavioral_tags?: BehavioralTag[];
  best_channel?: string;
}

export interface RunResult {
  status: string;
  top_segments: Segment[];
  avg_revenue_per_patient?: number;
}

export interface Procedure {
  name: string;
  count: number;
}

export type FocusType = 'non_inv' | 'surgical';
export type ThemeType = 'light' | 'dark';
