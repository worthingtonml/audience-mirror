'use client';

import { useState, useEffect } from 'react';
import { KeyInsight, INSIGHT_CONFIG } from './types';
import { TrendingUp, BarChart3, Sparkles, X } from 'lucide-react';
import './animations.css';

interface SideBoxProps {
  insight: KeyInsight;
  onDismiss: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const ICONS = {
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'sparkles': Sparkles,
};

const COLORS = {
  emerald: {
    dot: 'bg-emerald-400',
    iconBg: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
  },
  blue: {
    dot: 'bg-blue-400',
    iconBg: 'bg-blue-500/10',
    icon: 'text-blue-400',
  },
  amber: {
    dot: 'bg-amber-400',
    iconBg: 'bg-amber-500/10',
    icon: 'text-amber-400',
  },
  violet: {
    dot: 'bg-violet-400',
    iconBg: 'bg-violet-500/10',
    icon: 'text-violet-400',
  },
  rose: {
    dot: 'bg-rose-400',
    iconBg: 'bg-rose-500/10',
    icon: 'text-rose-400',
  },
};

export const SideBox: React.FC<SideBoxProps> = ({
  insight,
  onDismiss,
  autoHide = true,
  autoHideDelay = 10000,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const config = INSIGHT_CONFIG[insight.type];
  const colors = COLORS[config.accentColor];
  const Icon = ICONS[config.icon];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  useEffect(() => {
    if (!autoHide) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDelay);
    return () => clearTimeout(timer);
  }, [autoHide, autoHideDelay]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-40
        ${isExiting ? 'sidebox-exit' : 'sidebox-enter'}
      `}
    >
      <div className="bg-[#0a0a0b] rounded-2xl w-72 overflow-hidden shadow-2xl shadow-black/20">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full animate-pulse-dot`} />
              <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                {config.label}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">
                {insight.metricLabel}
              </p>
              <p className="text-white text-2xl font-bold">{insight.metric}</p>
              {insight.headline && (
                <p className="text-white/50 text-sm">{insight.headline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {insight.supportingStat && (
          <div className="px-5 py-3 bg-white/5 border-t border-white/5">
            <p className="text-white/40 text-sm">{insight.supportingStat}</p>
          </div>
        )}
      </div>
    </div>
  );
};
