'use client';

import { X, TrendingUp, BarChart3, Zap, Calendar, AlertTriangle, Lightbulb } from 'lucide-react';
import { bannerTypes, Insight } from './bannerTypes';

interface InsightBannerProps {
  insight: Insight;
  onDismiss?: () => void;
  onAction?: () => void;
  className?: string;
}

const ICON_MAP = {
  campaign_success: TrendingUp,
  benchmark: BarChart3,
  market_signal: Zap,
  timing: Calendar,
  urgent: AlertTriangle,
  growth: Lightbulb,
};

export function InsightBanner({ insight, onDismiss, onAction, className = '' }: InsightBannerProps) {
  const config = bannerTypes[insight.type];
  const Icon = ICON_MAP[insight.type];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4 relative ${className}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`absolute top-3 right-3 ${config.subtextColor} hover:${config.headlineColor} transition-colors`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center justify-between pr-6">
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider ${config.labelColor} mb-0.5`}>
              {config.label}
            </p>
            <p className={`font-semibold ${config.headlineColor}`}>{insight.headline}</p>
            <p className={`text-sm ${config.subtextColor}`}>{insight.subtext}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {insight.metric && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${config.iconColor}`}>{insight.metric}</p>
              {insight.metricLabel && <p className={`text-xs ${config.subtextColor}`}>{insight.metricLabel}</p>}
            </div>
          )}

          {onAction && insight.buttonText && (
            <button
              onClick={onAction}
              className={`px-4 py-2 ${config.buttonBg} ${config.buttonHover} text-white text-sm font-medium rounded-lg transition-colors`}
            >
              {insight.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
