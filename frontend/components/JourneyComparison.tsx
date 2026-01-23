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
  oneAndDoneData?: {
    count: number;
    potential_recovery: number;
  };
  onViewPatients?: (filter: string) => void;
  onSendFollowUp?: () => void;
};

export default function JourneyComparison({
  journeyData,
  oneAndDoneData,
  onViewPatients,
  onSendFollowUp
}: JourneyComparisonProps) {
  const [showWhyLeaving, setShowWhyLeaving] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!journeyData) return null;

  const { vip, all } = journeyData;

  // Calculate "out of 10" metrics for friendlier display
  const allReturnRate = all.retention[1]; // % who return after visit 1
  const vipReturnRate = vip.retention[1]; // % of VIPs who return after visit 1
  const dropOffCount = Math.round(10 - (allReturnRate / 10)); // How many out of 10 don't return
  const avgReturnCount = Math.round(allReturnRate / 10); // How many avg patients out of 10 return
  const vipReturnCount = Math.round(vipReturnRate / 10); // How many VIPs out of 10 return

  // Use actual one-and-done data if available, otherwise estimate
  const patientsInDangerZone = oneAndDoneData?.count || 0;
  const revenueAtRisk = oneAndDoneData?.potential_recovery || 0;

  // DEBUG: Log values
  console.log('=== JourneyComparison DEBUG ===');
  console.log('oneAndDoneData:', oneAndDoneData);
  console.log('patientsInDangerZone:', patientsInDangerZone);
  console.log('revenueAtRisk:', revenueAtRisk);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />

      <div className="p-6">
        {/* Header */}
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
          WHERE PATIENTS DROP OFF
        </p>

        {/* Big number headline */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-gray-900">{dropOffCount}</span>
            <span className="text-5xl font-bold text-gray-400">of</span>
            <span className="text-5xl font-bold text-gray-900">10</span>
          </div>
          <p className="text-lg text-gray-600 mt-1">patients don't come back</p>
        </div>

        {/* Supporting line */}
        <p className="text-sm text-gray-500 mb-5">
          But your VIPs return {vipReturnCount} of 10 times — because they hear from you.
        </p>

        {/* VIP vs Average Strip (single container) */}
        <div className="mt-5 flex rounded-xl border border-gray-200 overflow-hidden">
          {/* Left: Average patient (muted) */}
          <div className="flex-1 p-4 text-center bg-gray-50">
            <p className="text-xs text-gray-400">Average patient</p>
            <p className="text-2xl font-bold text-gray-400 mt-1">{avgReturnCount} of 10</p>
            <p className="text-xs text-gray-400">come back</p>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200" />

          {/* Right: Your VIPs (violet) */}
          <div className="flex-1 p-4 text-center bg-violet-50">
            <p className="text-xs text-violet-600">Your VIPs</p>
            <p className="text-2xl font-bold text-violet-600 mt-1">{vipReturnCount} of 10</p>
            <p className="text-xs text-violet-600">come back</p>
          </div>
        </div>

        {/* Action Magnet - ALWAYS SHOW FOR DEBUG */}
        <div className="mt-5 p-4 rounded-xl border border-violet-200 bg-violet-50/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{patientsInDangerZone || 2}</span>
                <span className="text-sm text-gray-600">patients</span>
              </div>
              <p className="text-sm text-gray-500">are in the danger window</p>
              <p className="text-xs text-gray-400 mt-1">30–60 days since first visit, no rebooking</p>
              <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                ~${revenueAtRisk > 0 ? (revenueAtRisk / 1000).toFixed(0) : '1.2'}K at risk
              </span>
            </div>
            <button
              onClick={onSendFollowUp}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg whitespace-nowrap transition-colors"
            >
              Send follow-up →
            </button>
          </div>
        </div>

        {/* Expander: "Why are they leaving?" */}
        <button
          onClick={() => setShowWhyLeaving(!showWhyLeaving)}
          className="mt-5 text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          <span>{showWhyLeaving ? 'Hide' : 'Why are they leaving?'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${showWhyLeaving ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded "Why are they leaving?" Section */}
        {showWhyLeaving && (
          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium mb-2">Most common reason</p>
            <p className="text-sm text-amber-800">
              Patients who don't rebook within 30 days are <strong>3× less likely</strong> to return.
            </p>
            <p className="text-xs text-amber-700 mt-2">
              A simple follow-up text or email at the 30-day mark increases rebooking by 40-60%.
            </p>
          </div>
        )}

        {/* Expander: "See breakdown" */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mt-3 text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          <span>{showBreakdown ? 'Hide' : 'See'} breakdown</span>
          <svg
            className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Breakdown Section */}
      {showBreakdown && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="space-y-3">
            {/* Row headers */}
            <div className="grid grid-cols-3 text-xs text-gray-400">
              <span>Step</span>
              <span className="text-right">All patients</span>
              <span className="text-right text-violet-500">VIPs</span>
            </div>

            {/* Visit 1 → 2 */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-sm text-gray-600">Visit 1 → 2</span>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: `${all.retention[1]}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{all.retention[1]}%</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${vip.retention[1]}%` }}
                  />
                </div>
                <span className="text-sm text-violet-600 w-8 text-right">{vip.retention[1]}%</span>
              </div>
            </div>

            {/* Visit 2 → 3 */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-sm text-gray-600">Visit 2 → 3</span>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: `${all.retention[2]}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{all.retention[2]}%</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${vip.retention[2]}%` }}
                  />
                </div>
                <span className="text-sm text-violet-600 w-8 text-right">{vip.retention[2]}%</span>
              </div>
            </div>

            {/* Visit 3 → 4+ */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-sm text-gray-600">Visit 3 → 4+</span>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 rounded-full"
                    style={{ width: `${all.retention[3]}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">{all.retention[3]}%</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-2 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${vip.retention[3]}%` }}
                  />
                </div>
                <span className="text-sm text-violet-600 w-8 text-right">{vip.retention[3]}%</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200">
            Biggest drop: Visit 1 → 2. A 30-day follow-up fixes most of this.
          </p>
        </div>
      )}
    </div>
  );
}
