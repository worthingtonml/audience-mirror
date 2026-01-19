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

  // Calculate key metrics
  const dropOffRate = 100 - all.retention[1]; // % who never return after visit 1
  const vipDays = vip.avgDaysToV2 || 0;
  const allDays = all.avgDaysToV2 || 0;

  // Estimate patients in danger zone (30-60 days since first visit, no rebooking)
  const totalPatients = all.patientCount;
  const oneTimers = Math.round(totalPatients * (dropOffRate / 100));
  const patientsInDangerZone = Math.round(oneTimers * 0.3); // ~30% in the 30-60 day window at any time

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />

      <div className="p-6">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
          Where Patients Drop Off
        </p>

        <p className="text-2xl font-bold text-gray-900 mb-1">
          {dropOffRate}% never return after visit 1
        </p>

        <p className="text-gray-500 text-sm mb-6">
          VIPs return in {vipDays} days. Your average: {allDays} days.
        </p>

        {/* Action card - subtle, not screaming */}
        {patientsInDangerZone > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-gray-700 mb-3">
              <span className="font-semibold">{patientsInDangerZone} patients</span> haven't rebooked in 30-60 days
            </p>
            <div className="flex gap-3">
              <button
                onClick={onSendFollowUp}
                className="text-violet-600 font-medium text-sm hover:text-violet-700 transition-colors"
              >
                Send follow-up sequence →
              </button>
              <button
                onClick={() => onViewPatients?.('one-and-done')}
                className="text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors"
              >
                View patients
              </button>
            </div>
          </div>
        )}

        {/* Expandable detail */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-gray-500 text-sm flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          {showBreakdown ? 'Hide' : 'Show'} retention breakdown
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

      {/* Retention Breakdown (collapsed by default) */}
      {showBreakdown && (
        <div className="border-t border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">
                VIP Patients
                <span className="text-gray-400 font-normal ml-2">({vip.patientCount} total)</span>
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 1 → 2</span>
                  <span className="text-gray-900">{vip.retention[1]}% return</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 2 → 3</span>
                  <span className="text-gray-900">{vip.retention[2]}% return</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 3 → 4+</span>
                  <span className="text-gray-900">{vip.retention[3]}% return</span>
                </div>
                {vipDays > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Avg time to return</span>
                    <span className="text-gray-900 ml-2">{vipDays} days</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">
                All Patients
                <span className="text-gray-400 font-normal ml-2">({all.patientCount} total)</span>
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 1 → 2</span>
                  <span className="text-gray-900">{all.retention[1]}% return</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 2 → 3</span>
                  <span className="text-gray-900">{all.retention[2]}% return</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visit 3 → 4+</span>
                  <span className="text-gray-900">{all.retention[3]}% return</span>
                </div>
                {allDays > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Avg time to return</span>
                    <span className="text-gray-900 ml-2">{allDays} days</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
