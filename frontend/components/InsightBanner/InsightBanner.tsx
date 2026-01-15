'use client';

import { X } from 'lucide-react';
import { bannerTypes, Insight } from './bannerTypes';

interface InsightBannerProps {
  insight: Insight;
  onDismiss: () => void;
  onAction?: () => void;
}

export function InsightBanner({ insight, onDismiss, onAction }: InsightBannerProps) {
  const colors = bannerTypes[insight.type];

  return (
    <div className={`${colors.bg} text-white rounded-2xl p-5 shadow-lg relative`}>
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center justify-between pr-10">
        {/* Left: Text content */}
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.eyebrowColor} mb-1`}>
            {insight.eyebrow}
          </p>
          <h3 className="text-2xl font-extrabold mb-1">
            {insight.headline}
          </h3>
          <p className={`text-sm ${colors.subtextColor}`}>
            {insight.subtext}
          </p>
        </div>

        {/* Right: Optional stat or button */}
        <div className="flex items-center gap-4">
          {insight.stat && insight.statLabel && (
            <div className="text-right mr-4">
              <div className="text-4xl font-extrabold">
                {insight.stat}
              </div>
              <div className={`text-xs ${colors.subtextColor} mt-1`}>
                {insight.statLabel}
              </div>
            </div>
          )}

          <button
            onClick={onAction}
            className={`px-4 py-2 ${colors.buttonBg} ${colors.buttonText} text-sm font-semibold rounded-lg ${colors.buttonHover} transition-colors flex-shrink-0`}
          >
            {insight.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
