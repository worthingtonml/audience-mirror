"use client";
import React from "react";
import MetricHelpButton from "./MetricHelpButton";

interface ExpansionHeroProps {
  targetZips: string[];
  patientsLow: number;
  patientsHigh: number;
  revLow: string;
  revHigh: string;
  onDiscover: () => void;
}

export default function ExpansionHero({
  targetZips,
  patientsLow,
  patientsHigh,
  revLow,
  revHigh,
  onDiscover,
    }: ExpansionHeroProps) {
    return (
        <section className="mb-10 rounded-2xl border border-gray-200 bg-slate-50 w-full max-w-5xl mx-auto shadow-sm px-0 py-0 overflow-visible">
    {/* Header */}
    <div className="flex flex-col items-start px-8 pt-8 pb-4">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-0">
    
    Expansion Opportunity
    </h2>

    {/* accuracy badge (hidden) */}
    {false && (
        <span
        className="ml-2 mt-2 inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5"
        title="Share of historical forecasts that landed within the Low–High band on held-out data."
        >
        <svg className="w-3 h-3 text-green-500 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Algorithm accuracy: 93%
        </span>
    )}
    </div>


      {/* KPI row */}
      <div className="flex flex-col md:flex-row md:space-x-0 divide-y md:divide-y-0 md:divide-x divide-gray-200 px-4 md:px-8 py-8">
        {/* Target Areas */}
        <div className="flex-1 flex flex-col justify-center items-center bg-white shadow-sm rounded-none first:rounded-l-2xl last:rounded-r-2xl h-full min-h-[170px] py-8 px-4 md:px-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Target Areas</div>
          <div
            className="text-xl font-bold text-primary-800 mb-1 truncate w-full text-center"
            title={targetZips.join(", ")}
          >
            {targetZips.slice(0, 3).join(", ")}
          </div>
          <div className="text-xs text-gray-500">ZIPs to focus your marketing</div>
        </div>

        {/* Est. Additional Patients/Month */}
        <div className="flex-1 flex flex-col justify-center items-center bg-white shadow-sm rounded-none first:rounded-l-2xl last:rounded-r-2xl h-full min-h-[170px] py-8 px-4 md:px-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Est. Additional Patients/Month</div>
          <div className="text-2xl font-bold text-green-800 mb-1">
            {patientsLow}
            {patientsHigh !== patientsLow && <span>–{patientsHigh}</span>}
          </div>
          <div className="text-xs text-gray-500">Incremental patient volume</div>
        </div>

        {/* Potential Additional Revenue/Year */}
        <div className="flex-1 flex flex-col justify-center items-center bg-white shadow-sm rounded-none first:rounded-l-2xl last:rounded-r-2xl h-full min-h-[170px] py-8 px-4 md:px-8">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Potential Additional Revenue/Year</div>
          <div className="text-2xl font-bold text-indigo-800 mb-1">
            {revLow}
            {revHigh !== revLow && <span>–{revHigh}</span>}
          </div>
          <div className="text-xs text-gray-500">Revenue from new patients</div>
        </div>
      </div>

      {/* Black help button UNDER the three boxes */}
      <div className="px-8 pb-6 -mt-2">
        <MetricHelpButton />
      </div>
    </section>
  );
}


