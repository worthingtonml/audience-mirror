import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface BookingRange {
  p10: number;
  p50: number;
  p90: number;
}




export interface TopSegment {
  zip: string;
  match_score: number;
  expected_bookings: BookingRange;
  distance_miles: number;
  competitors: number;
  cohort: string;
  why: string[];
  lat?: number;
  lon?: number;
}



export interface ExpansionMetrics {
  new_zip_count: number;
  monthly_patients_low: number;
  monthly_patients_high: number;
  annual_revenue_low: number;
  annual_revenue_high: number;
  current_zip_count: number;
}

export interface HeadlineMetrics {
  total_patients: number;
  total_revenue: number;
  avg_revenue: number;
  high_value_count: number;
  unique_zips: number;
  expansion_metrics?: ExpansionMetrics;
}

export interface ExpansionMetrics {
  new_zip_count: number;
  monthly_patients_low: number;
  monthly_patients_high: number;
  annual_revenue_low: number;
  annual_revenue_high: number;
  current_zip_count: number;
}

export interface RunResult {
  status: string;
  headline_metrics: HeadlineMetrics;
  top_segments: TopSegment[];
  map_points: Array<{
    zip: string;
    lat: number;
    lon: number;
    score: number;
  }>;
  confidence_info: {
    level: "high" | "medium" | "early";
    message: string;
    status: "learned" | "estimated";
    n_zips: number;
  };
  expansion_metrics?: ExpansionMetrics;
}


export async function uploadDataset(
  patientsFile: File,
  practiceZip: string,
  competitorsFile?: File,
  vertical: string = 'medspa'
): Promise<string> {
  const formData = new FormData();
  formData.append('patients', patientsFile);
  formData.append('practice_zip', practiceZip);
  formData.append('vertical', vertical);
  
  if (competitorsFile) {
    formData.append('competitors', competitorsFile);
  }

  const response = await api.post('/api/v1/datasets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.dataset_id;
}

export async function createRun(
  datasetId: string,
  focus: 'non_inv' | 'surgical' = 'non_inv',
  marketTrend: number = 1.0,
  capacityPerWeek?: number
): Promise<string> {
  const response = await api.post('/api/v1/runs', {
    dataset_id: datasetId,
    focus,
    market_trend: marketTrend,
    capacity_per_week: capacityPerWeek,
  });

  return response.data.run_id;
}

export async function getRunResults(runId: string): Promise<RunResult> {
  console.log('🔍 API: Fetching run:', runId);
  const response = await api.get(`/api/v1/runs/${runId}`);
  console.log('🔍 API: Raw response:', response);
  console.log('🔍 API: Response data:', response.data);
  console.log('🔍 API: Response status:', response.status);
  return response.data;
}

export async function createExportUrls(runId: string, topN: number = 10) {
  const response = await api.post('/api/v1/exports', {
    run_id: runId,
    top_n: topN,
  });
  return response.data;
}

export function getExportUrl(runId: string, format: 'facebook' | 'google' | 'full', topN: number = 10): string {
  return `${API_BASE}/api/v1/exports/${runId}?format=${format}&top_n=${topN}`;
}