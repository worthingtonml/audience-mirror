'use client';

import { Users, ArrowRight, MapPin, Target, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PatientInsights() {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runId = sessionStorage.getItem('runId');

    if (!runId) {
      setError('No analysis found. Please upload patient data first.');
      setLoading(false);
      return;
    }

    const pollResults = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/runs/${runId}/results`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch results`);
        }

        const data = await response.json();
        console.log('[FRONTEND] API Response:', data);

        if (data.status === 'done') {
          setAnalysisData(data);
          setLoading(false);
        } else if (data.status === 'processing') {
          setTimeout(pollResults, 2000);
        } else if (data.status === 'error') {
          throw new Error(data.error || 'Analysis failed');
        } else {
          throw new Error(`Unknown status: ${data.status}`);
        }
      } catch (e: any) {
        console.error('[FRONTEND] Error:', e);
        setError(e.message);
        setLoading(false);
      }
    };

    pollResults();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700"
          >
            Upload New Data
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-slate-900 mb-2">
            Analyzing your patients...
          </div>
          <div className="text-sm text-slate-600">
            Building behavioral profiles and geographic insights
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">No data available</div>
        </div>
      </div>
    );
  }

  const {
    dominant_profile,
    profile_characteristics,
    behavior_patterns,
    geographic_summary,
    top_segments,
  } = analysisData;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Patient Intelligence</h1>
          <p className="text-slate-600">
            Profile-first analysis powered by behavioral + psychographic modeling
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white shadow-lg mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xs font-semibold text-indigo-200 mb-2 uppercase tracking-wide">
                Your Best Patients Are
              </div>
              <div className="text-4xl font-bold mb-3">
                {dominant_profile?.combined || 'Loading...'}
              </div>
              <div className="text-indigo-100 max-w-2xl leading-relaxed">
                {analysisData.profile_summary || 'Analyzing your patient base...'}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-center">
                <div className="text-xs text-indigo-200">Behavioral Match</div>
                <div className="text-2xl font-bold">
                  {dominant_profile?.behavioral_match_pct || 0}%
                </div>
              </div>
              <div className="rounded-lg bg-white/20 backdrop-blur-sm px-4 py-2 text-center">
                <div className="text-xs text-indigo-200">Psychographic Match</div>
                <div className="text-2xl font-bold">
                  {dominant_profile?.psychographic_match_pct || 0}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-6 pb-6 border-b border-white/20">
            <div>
              <div className="text-xs text-indigo-200 mb-1">Avg Lifetime Value</div>
              <div className="text-3xl font-bold">
                ${((behavior_patterns?.avg_lifetime_value || 0) / 1000).toFixed(1)}K
              </div>
            </div>
            <div>
              <div className="text-xs text-indigo-200 mb-1">Visit Frequency</div>
              <div className="text-3xl font-bold">
                {behavior_patterns?.avg_visits_per_year || 0}×
              </div>
              <div className="text-xs text-indigo-200">per year</div>
            </div>
            <div>
              <div className="text-xs text-indigo-200 mb-1">Treatments/Patient</div>
              <div className="text-3xl font-bold">
                {behavior_patterns?.avg_treatments_per_patient || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-indigo-200 mb-1">Top Treatment</div>
              <div className="text-2xl font-bold">
                {behavior_patterns?.top_treatments?.[0] || 'N/A'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-indigo-200 mb-3 uppercase">
                Profile Characteristics
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-100">Median Income</span>
                  <span className="font-semibold">
                    ${((profile_characteristics?.median_income || 0) / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">College Educated</span>
                  <span className="font-semibold">
                    {profile_characteristics?.college_educated_pct || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Homeownership</span>
                  <span className="font-semibold">
                    {profile_characteristics?.homeowner_pct || 0}%
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo-200 mb-3 uppercase">
                Market Opportunity
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-100">High-Match ZIPs</span>
                  <span className="font-semibold">
                    {geographic_summary?.total_zips || 0} ZIPs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Expansion Opportunities</span>
                  <span className="font-semibold">
                    {geographic_summary?.expansion_opportunity_zips || 0} new ZIPs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Addressable Market</span>
                  <span className="font-semibold">
                    {((geographic_summary?.total_addressable_households || 0) / 1000).toFixed(1)}K households
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Top Opportunities</h3>
                <p className="text-sm text-slate-600 mt-1">Ranked by profile match × market size</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Target className="h-4 w-4" />
                {top_segments?.length || 0} segments identified
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {(top_segments || []).map((segment: any, idx: number) => (
              <div key={segment.zip} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold ${
                        idx === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : idx === 1
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="font-mono text-xl font-bold text-slate-900">
                          {segment.zip}
                        </div>
                        {segment.is_new_market && (
                          <div className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">
                            🎯 EXPANSION
                          </div>
                        )}
                        <div className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-semibold">
                          {segment.cohort}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 mb-2">
                        {segment.location_name || `ZIP ${segment.zip}`}
                      </div>
                      <div className="text-sm text-slate-700 max-w-2xl">
                        {segment.demographic_description || 'Market analysis available'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      ${((segment.expected_monthly_revenue_p50 || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slate-500">monthly revenue (P50)</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Match:{' '}
                      <span className="font-semibold">
                        {((segment.match_score || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Expected Bookings</div>
                    <div className="text-lg font-bold text-slate-900">
                      {segment.expected_bookings?.p50 || 0}
                    </div>
                    <div className="text-xs text-slate-500">
                      ({segment.expected_bookings?.p10 || 0}-
                      {segment.expected_bookings?.p90 || 0} range)
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Max CPA</div>
                    <div className="text-lg font-bold text-slate-900">
                      ${segment.cpa_target || 0}
                    </div>
                    <div className="text-xs text-slate-500">5× ROAS target</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Distance</div>
                    <div className="text-lg font-bold text-slate-900">
                      {(segment.distance_miles || 0).toFixed(1)} mi
                    </div>
                    <div className="text-xs text-slate-500">from practice</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Competition</div>
                    <div className="text-lg font-bold text-slate-900">
                      {segment.competitors || 0}
                    </div>
                    <div className="text-xs text-slate-500">
                      {segment.competition_level || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Current Patients</div>
                    <div className="text-lg font-bold text-slate-900">
                      {segment.historical_patients || 0}
                    </div>
                    <div className="text-xs text-slate-500">
                      {((segment.market_penetration || 0) * 100).toFixed(2)}% penetration
                    </div>
                  </div>
                </div>

                {segment.strategic_insights && segment.strategic_insights.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                      Strategic Insights
                    </div>
                    <div className="space-y-1">
                      {segment.strategic_insights.map((insight: string, i: number) => (
                        <div key={i} className="text-xs text-slate-700 flex items-start gap-2">
                          <div className="text-emerald-600 mt-0.5">•</div>
                          <div>{insight}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    {(segment.behavioral_tags || []).map((tag: string) => (
                      <div
                        key={tag}
                        className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-medium"
                      >
                        {tag}
                      </div>
                    ))}
                    {segment.best_channel && (
                      <div className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
                        Best: {segment.best_channel}
                      </div>
                    )}
                  </div>
                  <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 flex items-center gap-2">
                    Generate campaign
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-indigo-900 mb-2">How This Analysis Works</h3>
              <div className="text-sm text-indigo-800 space-y-2">
                <div>
                  <span className="font-semibold">1. Behavioral Segmentation:</span> Classifies
                  your patients by actual spending patterns
                </div>
                <div>
                  <span className="font-semibold">2. Profile-First Scoring:</span> Identifies WHO
                  your best customers are, then finds WHERE similar people live
                </div>
                <div>
                  <span className="font-semibold">3. Psychographic Modeling:</span> Combines
                  demographics with lifestyle cohorts
                </div>
                <div>
                  <span className="font-semibold">4. Predictive Analytics:</span> Calculates
                  expected bookings with confidence intervals
                </div>
                <div>
                  <span className="font-semibold">5. Strategic Insights:</span> Generates CPA
                  targets, competition analysis, and distance economics
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
