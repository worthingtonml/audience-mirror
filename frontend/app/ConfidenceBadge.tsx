import React from 'react';

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low' | 'early' | 'estimated' | string;
  className?: string;
}

const LEVELS: Record<string, { color: string; label: string; explanation: string }> = {
  high: {
    color: 'bg-green-500',
    label: 'High confidence',
    explanation: 'Model is well-calibrated with sufficient data (n ≥ 10).',
  },
  medium: {
    color: 'bg-yellow-400',
    label: 'Medium confidence',
    explanation: 'Model is moderately calibrated (5 ≤ n < 10).',
  },
  low: {
    color: 'bg-orange-400',
    label: 'Low confidence',
    explanation: 'Model is weakly calibrated (3 ≤ n < 5).',
  },
  early: {
    color: 'bg-gray-400',
    label: 'Early estimate',
    explanation: 'Very little calibration data (n < 3). Results are rough estimates.',
  },
  estimated: {
    color: 'bg-gray-400',
    label: 'Estimated',
    explanation: 'Very little calibration data (n < 3). Results are rough estimates.',
  },
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level, className = '' }) => {
  const meta = LEVELS[level] || LEVELS['estimated'];
  const [show, setShow] = React.useState(false);

  return (
    <span
      className={`relative inline-flex items-center cursor-pointer group ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <span className={`w-2 h-2 rounded-full mr-1 ${meta.color}`}></span>
      <span className="text-xs text-gray-600 select-none">{meta.label}</span>
      {show && (
        <span className="absolute left-1/2 top-full z-10 mt-2 w-48 -translate-x-1/2 rounded bg-white border border-gray-200 shadow-lg px-3 py-2 text-xs text-gray-700 whitespace-normal">
          {meta.explanation}
        </span>
      )}
    </span>
  );
};
