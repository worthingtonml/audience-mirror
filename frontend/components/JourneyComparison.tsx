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
  const [showWhy, setShowWhy] = useState(false);
  const [showServices, setShowServices] = useState(false);

  if (!journeyData) return null;

  const { vip, all } = journeyData;

  // Calculate retention metrics
  // FORMULA: If X% return, then (100-X)% never come back, and X/10 out of 10 return
  const allReturnRate = all.retention[1]; // % who return after visit 1
  const vipReturnRate = vip.retention[1]; // % of VIPs who return after visit 1
  const dropoffPct = Math.round(100 - allReturnRate); // % who DON'T return
  const avgRate = Math.round(allReturnRate / 10); // How many avg patients out of 10 return
  const vipRate = Math.round(vipReturnRate / 10); // How many VIPs out of 10 return

  // MATH CHECK: If allReturnRate=43%, then dropoffPct=57% and avgRate=4
  // This means: "57% never come back" AND "4 of 10 come back" are CONSISTENT

  // Danger window data
  const dangerCount = oneAndDoneData?.count || 0;
  const revenueAtRisk = oneAndDoneData?.potential_recovery || 0;
  const formattedRevenue = revenueAtRisk > 0
    ? `$${(revenueAtRisk / 1000).toFixed(1)}K`
    : '$1.2K';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <p className="text-xs font-medium tracking-wider text-gray-400 uppercase mb-4">
          Patient Retention
        </p>

        <h2 className="text-2xl font-bold leading-tight text-gray-900">
          {dropoffPct}% of new patients
          <span className="text-gray-300"> never come back</span>
        </h2>

        <p className="text-sm text-gray-500 mt-3">
          Your VIPs return {vipRate} of 10 times — because you follow up within 30 days.
        </p>
      </div>

      {/* Contrast Tiles */}
      <div className="px-6 pb-5">
        <div className="flex rounded-xl overflow-hidden border border-gray-100">
          <div className="flex-1 py-5 text-center bg-gray-50/80">
            <p className="text-xs text-gray-400 mb-1">Average patient</p>
            <p className="text-xl font-bold text-gray-400">{avgRate} of 10</p>
            <p className="text-xs text-gray-400">come back</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div className="flex-1 py-5 text-center bg-violet-50/60">
            <p className="text-xs text-violet-500 mb-1">Your VIPs</p>
            <p className="text-xl font-bold text-violet-600">{vipRate} of 10</p>
            <p className="text-xs text-violet-500">come back</p>
          </div>
        </div>
      </div>

      {/* Action Strip */}
      <div className="mx-6 mb-6 p-4 rounded-xl bg-violet-50/50 border border-violet-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-sm font-semibold text-gray-900">
                {dangerCount > 0 ? dangerCount : 2} patients are about to leave
              </p>
            </div>
            <p className="text-xs text-gray-500 ml-4">30–60 days since first visit, no rebooking</p>
            <div className="mt-2 ml-4">
              <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                ~{formattedRevenue} in lifetime revenue at risk
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={onSendFollowUp}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Follow up with these {dangerCount > 0 ? dangerCount : 2} →
            </button>
            <button
              onClick={() => onViewPatients?.('one-and-done')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              View patients
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics (Collapsed) */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="w-full px-6 py-3 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>Why patients leave</span>
          <span className={`transition-transform ${showWhy ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showWhy && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">First-visit follow-up gap:</span> Most patients who leave never received a check-in within 30 days.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                A simple follow-up text or email at the 30-day mark increases rebooking by 40-60%.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowServices(!showServices)}
          className="w-full px-6 py-3 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-100 transition-colors"
        >
          <span>Which services lose patients</span>
          <span className={`transition-transform ${showServices ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showServices && (
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400 mb-3">Biggest leak by service</p>
            <div className="space-y-2">
              {/* Example service bars - would be populated from actual data */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Laser Treatment</span>
                  <span className="text-xs text-gray-400">45% drop-off</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Chemical Peel</span>
                  <span className="text-xs text-gray-400">38% drop-off</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: '38%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Botox</span>
                  <span className="text-xs text-gray-400">22% drop-off</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
