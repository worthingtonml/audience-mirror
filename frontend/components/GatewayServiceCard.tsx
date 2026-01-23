'use client';

import { useState } from 'react';

type GatewayServiceData = {
  service: string;
  multiplier: number;
  patient_count: number;
  avg_ltv: number;
  total_value: number;
  overall_avg_ltv?: number;
  cross_sell?: {
    service: string;
    percentage: number;
  }[];
};

type GatewayServiceCardProps = {
  gatewayData: GatewayServiceData;
  onPromote?: () => void;
};

export default function GatewayServiceCard({
  gatewayData,
  onPromote
}: GatewayServiceCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (!gatewayData) return null;

  const { service, multiplier, patient_count, avg_ltv, total_value, overall_avg_ltv, cross_sell } = gatewayData;
  const avgLTV = overall_avg_ltv || (avg_ltv / multiplier);

  // Calculate total value if not provided
  const calculatedTotalValue = total_value || (avg_ltv * patient_count);
  const formattedTotalValue = calculatedTotalValue > 1000000
    ? `$${(calculatedTotalValue / 1000000).toFixed(1)}M`
    : `$${(calculatedTotalValue / 1000).toFixed(0)}K`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Main Row */}
      <div className="p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">💎</span>
        </div>

        {/* Text + Stats */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-0.5">
            {service} creates {multiplier}× more valuable patients
          </h3>
          <p className="text-sm text-gray-500">
            {patient_count} patients · {formattedTotalValue} in value created
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onPromote}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Promote {service} →
        </button>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className={`transition-transform inline-block ${showDetail ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* Expanded Detail */}
      {showDetail && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <div className="space-y-4">
            {/* LTV Comparison */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Lifetime Value Comparison</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Average patient</span>
                    <span className="text-xs font-medium text-gray-900">${Math.round(avgLTV).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-green-600 font-medium">{service} patient</span>
                    <span className="text-xs font-medium text-green-600">${avg_ltv.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-sell Stats (if available) */}
            {cross_sell && cross_sell.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">What {service} patients buy next</p>
                <div className="flex flex-wrap gap-2">
                  {cross_sell.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full"
                    >
                      {item.percentage}% return for {item.service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
