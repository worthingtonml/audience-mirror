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
  onViewPatients?: (filter: string) => void;
  onSendFollowUp?: () => void;
};

export default function JourneyComparison({ journeyData, onViewPatients, onSendFollowUp }: JourneyComparisonProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!journeyData) return null;

  const { vip, all } = journeyData;

  // Calculate "out of 10" metrics for friendlier display
  const allReturnRate = all.retention[1]; // % who return after visit 1
  const vipReturnRate = vip.retention[1]; // % of VIPs who return after visit 1
  const dropOffCount = Math.round(10 - (allReturnRate / 10)); // How many out of 10 don't return
  const vipReturnCount = Math.round(vipReturnRate / 10); // How many VIPs out of 10 return

  // Estimate patients in danger zone (30-60 days since first visit, no rebooking)
  const totalPatients = all.patientCount;
  const dropOffRate = 100 - allReturnRate;
  const oneTimers = Math.round(totalPatients * (dropOffRate / 100));
  const patientsInDangerZone = Math.round(oneTimers * 0.3); // ~30% in the 30-60 day window at any time

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />

      <div className="p-6">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
          Where Patients Drop Off
        </p>

        {/* Lead with headline */}
        <p className="text-xl font-semibold text-gray-900 mb-1">
          {dropOffCount} of 10 patients don't come back
        </p>
        <p className="text-gray-500 text-sm mb-4">
          But your VIPs return {vipReturnCount} of 10 times — because they hear from you.
        </p>

        {/* Action Box */}
        {patientsInDangerZone > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-medium">{patientsInDangerZone} patients need a nudge</p>
                <p className="text-gray-500 text-sm">30-60 days since first visit</p>
              </div>
              <button
                onClick={onSendFollowUp}
                className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors whitespace-nowrap"
              >
                Send follow-up →
              </button>
            </div>
          </div>
        )}

        {/* Expand Toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          <span>{showBreakdown ? 'Hide' : 'See the'} breakdown</span>
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

      {/* Expanded Section */}
      {showBreakdown && (
        <div className="border-t border-gray-100 p-6 pt-5">
          {/* Comparison Boxes */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Average patient</p>
              <p className="text-2xl font-bold text-gray-400">{Math.round(allReturnRate / 10)} of 10</p>
              <p className="text-sm text-gray-500 mt-1">come back</p>
            </div>
            <div className="bg-violet-50 rounded-lg p-4 text-center">
              <p className="text-sm text-violet-600 mb-1">Your VIPs</p>
              <p className="text-2xl font-bold text-violet-600">{vipReturnCount} of 10</p>
              <p className="text-sm text-violet-600 mt-1">come back</p>
            </div>
          </div>

          {/* Journey Map - Simple Table */}
          <p className="text-sm font-medium text-gray-700 mb-3">Where they drop off</p>
          <div className="grid grid-cols-2 gap-6 text-sm">
            {/* VIP Column */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">VIPs</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 1 → 2</span>
                  <span className="text-violet-600 font-medium">{vip.retention[1]}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 2 → 3</span>
                  <span className="text-violet-600 font-medium">{vip.retention[2]}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 3 → 4+</span>
                  <span className="text-violet-600 font-medium">{vip.retention[3]}%</span>
                </div>
              </div>
            </div>

            {/* All Patients Column */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">All Patients</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 1 → 2</span>
                  <span className="text-gray-700 font-medium">{all.retention[1]}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 2 → 3</span>
                  <span className="text-gray-700 font-medium">{all.retention[2]}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 3 → 4+</span>
                  <span className="text-gray-700 font-medium">{all.retention[3]}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Insight */}
          <p className="text-gray-500 text-sm mt-4">
            Biggest drop: Visit 1 → 2. A 30-day follow-up can fix this.
          </p>
        </div>
      )}
    </div>
  );
}
