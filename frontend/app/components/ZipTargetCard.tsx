import React from 'react';
import { Segment } from '../lib/types';
import { formatZipCode } from '../lib/utils';
import { COHORT_COLORS, COHORT_TAGS } from '../lib/constants';

interface ZipTargetCardProps {
  segment: Segment;
  index: number;
  onGenerateCampaign: (segment: Segment) => void;
}

export default function ZipTargetCard({ segment, index, onGenerateCampaign }: ZipTargetCardProps) {
  // Update to use backend field names
  const cohortColor = COHORT_COLORS[segment.cohort] || COHORT_COLORS['Budget Conscious'];
  const cohortTags = COHORT_TAGS[segment.cohort] || [];

  const getCompetitionLabel = (competitors: number): string => {
    if (competitors === 0) return 'None';
    if (competitors <= 2) return 'Low';
    return 'High';
  };

  const calculateMonthlyRevenue = (): string => {
    const booking = segment.expected_bookings?.p50 || 6.5;
    return (booking * 400 / 1000).toFixed(1);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-gray-900">#{index + 1}</div>
            <div className="h-8 w-px bg-gray-300"></div>
            <h3 className="text-xl font-bold text-gray-900">
              ZIP {formatZipCode(segment.zip)}
            </h3>
          </div>
          <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg">
            {Math.round(Number(segment.match_score) * (Number(segment.match_score) <= 1 ? 100 : 1))}% Match
          </div>
        </div>
        <div className="text-sm text-gray-500 pl-16">
          {segment.location_name || segment.area || 'Unknown Area'}
        </div>
      </div>
      
      <div className="mb-5">
        <div 
          className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: cohortColor }}
        >
          {segment.cohort}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {segment.distance_miles != null ? Number(segment.distance_miles).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">miles away</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {segment.competition_level || getCompetitionLabel(segment.competitors)}
          </div>
          <div className="text-xs text-gray-500 mt-1">competition</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            ${segment.monthly_revenue_potential ? (Number(segment.monthly_revenue_potential) / 1000).toFixed(1) : calculateMonthlyRevenue()}K
          </div>
          <div className="text-xs text-gray-500 mt-1">monthly</div>
        </div>
      </div>

      <div className="mb-5 flex-grow">
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          {segment.demographic_description ||
           segment.strategic_insights?.[0] || 
           `${segment.cohort} demographic in ${segment.location_name || segment.area || 'this area'}.`}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {(segment.behavioral_tags?.map((tag: any, i: number) => (
            <span 
              key={i}
              className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700"
            >
              {typeof tag === 'string' ? tag : tag.label}
            </span>
          ))) || (cohortTags.map((tag, i) => (
            <span 
              key={i}
              className={`text-xs px-2 py-1 rounded ${
                tag.color === 'purple' 
                  ? 'bg-purple-50 text-purple-700' 
                  : 'bg-orange-50 text-orange-700'
              }`}
            >
              {tag.label}
            </span>
          )))}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="font-medium">
            Best channel: {segment.best_channel || segment.recommended_platform || 'Facebook'}
          </span>
        </div>
      </div>

      <button
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
        onClick={() => onGenerateCampaign(segment)}
      >
        Generate Campaign Intelligence
      </button>
    </div>
  );
}