"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import { BarChart3, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://audience-mirror-api.onrender.com';

interface CampaignStats {
  segment: string;
  targeted: number;
  returned: number;
  rate: number;
  revenue: number;
}

interface PerformanceData {
  campaigns: CampaignStats[];
  totals: {
    targeted: number;
    returned: number;
    rate: number;
    revenue: number;
  };
}

const segmentLabels: Record<string, string> = {
  'one-and-done': 'Win-back',
  'lapsed': 'Lapsed outreach',
  'vip': 'VIP program',
  'referrers': 'Referral program',
  'cross-sell': 'Cross-sell'
};

const segmentColors: Record<string, string> = {
  'one-and-done': 'bg-rose-400',
  'lapsed': 'bg-orange-400',
  'vip': 'bg-emerald-400',
  'referrers': 'bg-blue-400',
  'cross-sell': 'bg-purple-400'
};

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/performance/summary`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectReturns = async () => {
    const runId = sessionStorage.getItem('runId');
    if (!runId) {
      alert('Please upload patient data first to detect returns');
      return;
    }

    setDetecting(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/runs/${runId}/detect-returns`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Detected ${result.returns_detected} returned patients! Revenue: $${result.total_revenue_recovered.toLocaleString()}`);
        fetchPerformance();
      }
    } catch (error) {
      console.error('Failed to detect returns:', error);
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaign Performance</h1>
              <p className="text-gray-500 mt-1">Track your outreach results</p>
            </div>
            <button
              onClick={detectReturns}
              disabled={detecting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${detecting ? 'animate-spin' : ''}`} />
              {detecting ? 'Checking...' : 'Check for returns'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : !data || data.campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h2>
              <p className="text-gray-500 mb-6">
                Start by sending outreach from the Patient Retention page.<br />
                When patients return, their results will show here.
              </p>
              <a
                href="/patient-insights"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Go to Patient Retention
              </a>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-emerald-50 rounded-xl p-5 text-center">
                  <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-emerald-600">{data.totals.returned}</div>
                  <div className="text-sm text-emerald-700">Patients recovered</div>
                  <div className="text-xs text-emerald-600 mt-1">of {data.totals.targeted} targeted</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-5 text-center">
                  <DollarSign className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-blue-600">${data.totals.revenue.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Revenue recovered</div>
                  <div className="text-xs text-blue-600 mt-1">from returning patients</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 text-center">
                  <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-purple-600">{data.totals.rate}%</div>
                  <div className="text-sm text-purple-700">Conversion rate</div>
                  <div className="text-xs text-purple-600 mt-1">overall average</div>
                </div>
              </div>

              {/* Campaign Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">By Campaign</h2>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Targeted</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Converted</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((campaign, idx) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${segmentColors[campaign.segment] || 'bg-gray-400'}`}></div>
                            <span className="font-medium text-gray-900">
                              {segmentLabels[campaign.segment] || campaign.segment}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">{campaign.targeted}</td>
                        <td className="px-6 py-4 text-center font-medium text-gray-900">{campaign.returned}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.rate >= 50 ? 'bg-emerald-50 text-emerald-700' :
                            campaign.rate >= 20 ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {campaign.rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                          +${campaign.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-6 py-4 font-semibold text-gray-900">Total</td>
                      <td className="px-6 py-4 text-center text-gray-600">{data.totals.targeted}</td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900">{data.totals.returned}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                          {data.totals.rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 text-lg">
                        +${data.totals.revenue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Help text */}
              <p className="text-center text-sm text-gray-400 mt-6">
                Click "Check for returns" after uploading new patient data to detect who came back.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
