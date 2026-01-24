'use client';

import { ArrowUpRight } from 'lucide-react';

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
  if (!gatewayData) return null;

  const { service, multiplier, patient_count, avg_ltv, total_value } = gatewayData;

  // Calculate total value if not provided
  const calculatedTotalValue = total_value || (avg_ltv * patient_count);
  const formattedTotalValue = calculatedTotalValue > 1000000
    ? `$${(calculatedTotalValue / 1000000).toFixed(1)}M`
    : `$${(calculatedTotalValue / 1000).toFixed(0)}K`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Main Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4 text-violet-600" />
          </div>

          {/* Text + Stats */}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {service} creates your highest-value patients
            </p>
            <p className="text-xs text-gray-500">
              <span className="text-violet-600 font-semibold">{multiplier}×</span> higher LTV · {patient_count} patients · {formattedTotalValue} created
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onPromote}
          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Promote {service} →
        </button>
      </div>


      {/* Optional: Expandable detail if needed in future */}
    </div>
  );
}
