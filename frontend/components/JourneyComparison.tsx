'use client';

import { useState } from 'react';

type JourneyData = {
  vip: {
    retention: number[];
    avgDaysToV2: number | null;
    patientCount: number;
    servicePath: string[] | null;
  };
  all: {
    retention: number[];
    avgDaysToV2: number | null;
    patientCount: number;
    servicePath: string[] | null;
  };
  biggestDropOff: {
    stage: string;
    vipRate: number;
    allRate: number;
    gap: number;
  };
};

type JourneyComparisonProps = {
  journeyData: JourneyData;
};

export default function JourneyComparison({ journeyData }: JourneyComparisonProps) {
  const [activeTab, setActiveTab] = useState<'retention' | 'service'>('retention');

  if (!journeyData) return null;

  const { vip, all, biggestDropOff } = journeyData;

  // Generate insight based on data
  const generateInsight = () => {
    if (activeTab === 'retention') {
      const vipDays = vip.avgDaysToV2 || 0;
      const allDays = all.avgDaysToV2 || 0;
      return `${all.retention[1]}% of patients never return after visit 1. VIPs return in ${vipDays} days, average patients take ${allDays} days. The critical window is days 30-60.`;
    } else {
      if (vip.servicePath && vip.servicePath.length > 1 && all.servicePath) {
        return `VIPs expand into ${vip.servicePath[1]} after ${vip.servicePath[0]}. Average patients stick to one service and churn. Cross-sell within 60 days.`;
      }
      return 'VIPs diversify their treatments while average patients tend to stick to one service.';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />

      <div className="p-6">
        {/* Header with tabs */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
              Patient Journey
            </p>
            <h2 className="text-xl font-bold text-gray-900">VIP Path vs All Patients</h2>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'retention' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('retention')}
            >
              Retention
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'service' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('service')}
            >
              Service Path
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'retention' && <RetentionFunnel vipData={vip} allData={all} />}
        {activeTab === 'service' && <ServicePath vipData={vip} allData={all} />}

        {/* Insight callout */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-sm">
            <span className="font-semibold">Critical insight:</span> {generateInsight()}
          </p>
        </div>
      </div>
    </div>
  );
}

// Retention Funnel Component
function RetentionFunnel({ vipData, allData }: { vipData: JourneyData['vip']; allData: JourneyData['all'] }) {
  const stages = ['Visit 1', 'Visit 2', 'Visit 3', 'Visit 4+'];

  // Calculate retention rates (what % move from one stage to next)
  const calculateRetentionRate = (retention: number[], index: number) => {
    if (index === 0) return 100;
    if (retention[index - 1] === 0) return 0;
    return Math.round((retention[index] / retention[index - 1]) * 100);
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* VIP Column */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
            VIP Patients
          </span>
          <span className="text-gray-400 text-sm">{vipData.patientCount} patients</span>
        </div>

        {stages.map((visit, i) => {
          const retentionRate = i > 0 ? calculateRetentionRate(vipData.retention, i) : 100;
          const avgDays = i === 1 ? vipData.avgDaysToV2 : null;

          return (
            <div key={visit} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{visit}</span>
                <span className="font-semibold text-gray-900">{vipData.retention[i]}%</span>
              </div>
              <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-lg transition-all"
                  style={{ width: `${vipData.retention[i]}%` }}
                />
              </div>
              {i < 3 && (
                <p className="text-xs text-gray-400 mt-1 pl-2">
                  ↓ {retentionRate}% return{avgDays ? ` · avg ${avgDays} days` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* All Patients Column */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            All Patients
          </span>
          <span className="text-gray-400 text-sm">{allData.patientCount} patients</span>
        </div>

        {stages.map((visit, i) => {
          const retentionRate = i > 0 ? calculateRetentionRate(allData.retention, i) : 100;
          const avgDays = i === 1 ? allData.avgDaysToV2 : null;
          const gap = vipData.retention[i] - allData.retention[i];
          const isHighGap = gap >= 15;

          return (
            <div key={visit} className={`mb-4 ${isHighGap ? 'p-2 bg-amber-50 rounded-lg border border-amber-200' : ''}`}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{visit}</span>
                <span className="font-semibold text-gray-900">{allData.retention[i]}%</span>
              </div>
              <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-lg transition-all"
                  style={{ width: `${allData.retention[i]}%` }}
                />
              </div>
              {i < 3 && (
                <p className="text-xs text-gray-400 mt-1 pl-2">
                  ↓ {retentionRate}% return{avgDays ? ` · avg ${avgDays} days` : ''}
                </p>
              )}
              {isHighGap && (
                <p className="text-xs text-amber-700 font-medium mt-1 pl-2">
                  {gap}% gap — major drop-off point
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Service Path Component
function ServicePath({ vipData, allData }: { vipData: JourneyData['vip']; allData: JourneyData['all'] }) {
  const vipPath = vipData.servicePath || [];
  const allPath = allData.servicePath || [];

  return (
    <div>
      {/* VIP Path */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-3">VIP progression</p>
        <div className="flex items-center gap-2 flex-wrap">
          {vipPath.map((service, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg font-medium text-sm">
                {service}
              </div>
              {i < vipPath.length - 1 && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
        {vipPath.length === 0 && (
          <p className="text-gray-400 text-sm italic">Not enough data to determine service path</p>
        )}
      </div>

      {/* All Patients Path */}
      <div>
        <p className="text-sm text-gray-500 mb-3">Average patient</p>
        <div className="flex items-center gap-2 flex-wrap">
          {allPath.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                {allPath[0]}
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {allPath.length > 1 ? (
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm">
                  {allPath[1]}
                </div>
              ) : (
                <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg font-medium text-sm border border-amber-200">
                  Same service or churn
                  <span className="text-amber-500 text-xs ml-1">
                    {100 - allData.retention[1]}% leave
                  </span>
                </div>
              )}
            </>
          )}
          {allPath.length === 0 && (
            <p className="text-gray-400 text-sm italic">Not enough data to determine service path</p>
          )}
        </div>
      </div>
    </div>
  );
}
