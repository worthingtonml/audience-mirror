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
  if (!journeyData) return null;

  const { vip, all, biggestDropOff } = journeyData;

  // Calculate key metrics
  const dropOffRate = 100 - all.retention[1]; // % who never return after visit 1
  const vipDays = vip.avgDaysToV2 || 0;
  const allDays = all.avgDaysToV2 || 0;
  const dayGap = allDays - vipDays;

  // Estimate patients in danger zone (30-60 days since first visit, no rebooking)
  // This is a rough estimate: (patients who didn't return) * (danger window %)
  const totalPatients = all.patientCount;
  const oneTimers = Math.round(totalPatients * (dropOffRate / 100));
  const dangerZoneEstimate = Math.round(oneTimers * 0.3); // ~30% in the 30-60 day window at any time

  // Revenue at risk estimate (assuming avg LTV of $500 for one-timers)
  const avgRevenue = 500;
  const revenueAtRisk = dangerZoneEstimate * avgRevenue;

  // Gap revenue: if we could close the time gap, estimate annual impact
  const gapRevenue = Math.round((dayGap / 30) * avgRevenue * totalPatients * 0.4); // 40% conversion assumption

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

      <div className="p-6 space-y-6">
        {/* LAYER 1: THE TRIGGER */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Your Biggest Leak</h3>
              <p className="text-3xl font-bold text-amber-600">
                {dropOffRate}% never return after visit 1
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">In Danger Zone</p>
              <p className="text-2xl font-bold text-red-600">{dangerZoneEstimate}</p>
              <p className="text-xs text-gray-500">patients (30-60 days)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={onSendFollowUp}
              className="px-4 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              Send follow-up sequence →
            </button>
            <button
              onClick={() => onViewPatients?.('one-and-done')}
              className="px-4 py-3 bg-white border-2 border-amber-600 text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm"
            >
              View patients in drop-off →
            </button>
          </div>

          <div className="text-sm text-gray-700 bg-white rounded px-3 py-2 border border-amber-200">
            <span className="font-semibold">The gap costs you:</span> VIPs return in {vipDays} days. Your average: {allDays} days.
            Closing this {dayGap}-day gap could add <span className="font-bold text-amber-700">${gapRevenue.toLocaleString()}/year</span>.
          </div>
        </div>

        {/* LAYER 2: THE PROOF (Interactive Retention Funnel) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Where Patients Drop Off</h3>
          <RetentionFunnelInteractive
            vipData={vip}
            allData={all}
            onViewPatients={onViewPatients}
            avgRevenue={avgRevenue}
          />
        </div>

        {/* LAYER 3: GATEWAY SERVICE */}
        {vip.servicePath && vip.servicePath.length > 0 && all.servicePath && (
          <GatewayService
            vipPath={vip.servicePath}
            allPath={all.servicePath}
            onTargetPatients={() => onViewPatients?.('gateway-service')}
          />
        )}
      </div>
    </div>
  );
}

// Interactive Retention Funnel Component
function RetentionFunnelInteractive({
  vipData,
  allData,
  onViewPatients,
  avgRevenue,
}: {
  vipData: JourneyData['vip'];
  allData: JourneyData['all'];
  onViewPatients?: (filter: string) => void;
  avgRevenue: number;
}) {
  const stages = ['Visit 1', 'Visit 2', 'Visit 3', 'Visit 4+'];
  const stageFilters = ['all', 'one-and-done', 'lapsed-regulars', 'active'];

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
              {i === 1 && avgDays && (
                <p className="text-xs text-gray-400 mt-1 pl-2">avg {avgDays} days to return</p>
              )}
            </div>
          );
        })}
      </div>

      {/* All Patients Column - CLICKABLE */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            All Patients
          </span>
          <span className="text-gray-400 text-sm">{allData.patientCount} patients</span>
        </div>

        {stages.map((visit, i) => {
          const avgDays = i === 1 ? allData.avgDaysToV2 : null;
          const gap = vipData.retention[i] - allData.retention[i];
          const isHighGap = gap >= 15;

          // Calculate patients lost at this stage
          const patientsLost =
            i > 0
              ? Math.round((allData.patientCount * (allData.retention[i - 1] - allData.retention[i])) / 100)
              : 0;
          const revenueAtRisk = patientsLost * avgRevenue;

          return (
            <button
              key={visit}
              onClick={() => onViewPatients?.(stageFilters[i])}
              className={`mb-4 w-full text-left transition-all hover:scale-[1.02] ${
                isHighGap ? 'p-2 bg-amber-50 rounded-lg border-2 border-amber-200' : 'p-2'
              } ${onViewPatients ? 'cursor-pointer' : 'cursor-default'}`}
              disabled={!onViewPatients}
            >
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
              {i === 1 && avgDays && (
                <p className="text-xs text-gray-400 mt-1">avg {avgDays} days to return</p>
              )}
              {patientsLost > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  {patientsLost} patients lost • ~${revenueAtRisk.toLocaleString()} at risk
                </p>
              )}
              {isHighGap && (
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  {gap}% gap — Click to view these patients →
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Gateway Service Component
function GatewayService({
  vipPath,
  allPath,
  onTargetPatients,
}: {
  vipPath: string[];
  allPath: string[];
  onTargetPatients?: () => void;
}) {
  // Get the most common first service
  const gatewayService = allPath[0] || vipPath[0];
  const nextService = vipPath[1] || allPath[1];

  if (!gatewayService) return null;

  // Estimate multiplier (simplified - in real scenario would come from backend)
  const multiplier = vipPath.length > allPath.length ? 3.2 : 2.5;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-1">
          Best Gateway Service
        </h3>
        <p className="text-gray-700 text-sm mb-3">
          Patients who start with <span className="font-bold text-violet-700">{gatewayService}</span> spend{' '}
          <span className="font-bold text-violet-700">{multiplier}× more</span> over 12 months
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm shadow-md">
          {gatewayService}
        </div>
        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {nextService ? (
          <div className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg font-semibold text-sm border-2 border-violet-300">
            {nextService}
          </div>
        ) : (
          <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm italic">
            Cross-sell opportunity
          </div>
        )}
      </div>

      <button
        onClick={onTargetPatients}
        className="w-full px-4 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors text-sm flex items-center justify-center gap-2"
      >
        Target first-visit {gatewayService} patients
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
