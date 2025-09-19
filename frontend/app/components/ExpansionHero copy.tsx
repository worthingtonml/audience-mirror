"use client";
import React from "react";
import { CheckCircle2, TrendingUp, Users, DollarSign } from "lucide-react";

const BRAND_GRADIENT = "linear-gradient(135deg, #6366F1 0%, #3B82F6 50%, #8B5CF6 100%)";

interface ExpansionHeroProps {
  targetZips: string[];
  patientsLow: number;
  patientsHigh: number;
  revLow: string;
  revHigh: string;
  onDiscover: () => void;
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: {
  icon: any;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 backdrop-blur-2xl">
      <div className="flex items-center space-x-3 mb-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/60 font-medium">{label}</div>
      </div>
      <div className={`text-2xl font-semibold tracking-tight mb-1 ${color === 'bg-gradient-to-r from-indigo-500 to-purple-600' ? 'text-gray-900 dark:text-white' : color === 'bg-gradient-to-r from-emerald-500 to-teal-600' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-white/60">{subtitle}</div>
    </div>
  );
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
    <section className="rounded-3xl border border-gray-200 dark:border-white/12 bg-white dark:bg-white/[0.03] backdrop-blur-2xl shadow-[0_20px_80px_-30px_rgba(0,0,0,0.7)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/10 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 
              className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent mb-2"
              style={{ backgroundImage: BRAND_GRADIENT }}
            >
              Expansion Opportunity
            </h2>
            <p className="text-gray-600 dark:text-white/70">Strategic growth opportunities identified by our algorithm</p>
          </div>
          <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">93% Accuracy</span>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="p-8">
        <div className="grid md:grid-cols-3 gap-6">
          <MetricCard
            icon={TrendingUp}
            label="Target Areas"
            value={targetZips.slice(0, 3).join(", ")}
            subtitle="High-opportunity ZIP codes"
            color="bg-gradient-to-r from-indigo-500 to-purple-600"
          />
          
          <MetricCard
            icon={Users}
            label="Est. Additional Patients/Month"
            value={`${patientsLow}${patientsHigh !== patientsLow ? `–${patientsHigh}` : ''}`}
            subtitle="Incremental patient volume"
            color="bg-gradient-to-r from-emerald-500 to-teal-600"
          />
          
          <MetricCard
            icon={DollarSign}
            label="Potential Revenue/Year"
            value={`${revLow}${revHigh !== revLow ? `–${revHigh}` : ''}`}
            subtitle="Revenue from new patients"
            color="bg-gradient-to-r from-blue-500 to-indigo-600"
          />
        </div>

        {/* CTA Button */}
        <div className="mt-8 text-center">
          <button
            onClick={onDiscover}
            className="inline-flex items-center space-x-2 px-8 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg transform hover:-translate-y-0.5 backdrop-blur-xl"
            style={{ background: BRAND_GRADIENT }}
          >
            <span>Explore Target Areas</span>
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}