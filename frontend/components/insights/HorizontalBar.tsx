'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionableInsight, INSIGHT_CONFIG } from './types';
import { Users, Calendar, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import './animations.css';

interface HorizontalBarProps {
  insight: ActionableInsight;
  onDismiss: () => void;
  duration?: number;
}

const ICONS = {
  'users': Users,
  'calendar': Calendar,
  'alert-triangle': AlertTriangle,
};

const COLORS = {
  violet: {
    gradient: 'from-violet-400 to-purple-400',
    iconBg: 'bg-violet-500/10',
    icon: 'text-violet-400',
    dot: 'bg-violet-400',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-400',
    iconBg: 'bg-rose-500/10',
    icon: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-400',
    iconBg: 'bg-amber-500/10',
    icon: 'text-amber-400',
    dot: 'bg-amber-400',
  },
};

export const HorizontalBar: React.FC<HorizontalBarProps> = ({
  insight,
  onDismiss,
  duration = 10000,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const router = useRouter();

  const config = INSIGHT_CONFIG[insight.type];
  const colors = COLORS[config.accentColor];
  const Icon = ICONS[config.icon];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const handleAction = () => {
    // Navigate to anchor
    if (insight.anchor.startsWith('/')) {
      router.push(insight.anchor);
    } else if (insight.anchor.startsWith('#')) {
      const element = document.getElementById(insight.anchor.slice(1));
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    handleDismiss();
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    setIsPaused(true); // Keep paused after expanding
  };

  // Progress timer
  useEffect(() => {
    if (isPaused || isCollapsed) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 100));
        if (next <= 0) {
          setIsCollapsed(true); // Collapse instead of dismissing
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, isCollapsed, duration]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleDismiss]);

  // Collapsed Pill
  if (isCollapsed) {
    return (
      <div
        className={`
          fixed top-4 right-4 z-40
          ${isExiting ? 'pill-exit' : 'pill-enter'}
        `}
      >
        <div
          className="bg-[#0a0a0b] rounded-full px-4 py-2.5 flex items-center gap-3 shadow-2xl border border-white/[0.06] pill-pulse cursor-pointer"
          onClick={handleExpand}
        >
          <div className={`w-2 h-2 ${colors.dot} rounded-full animate-pulse-dot`} />
          <span className="text-white text-sm font-medium">1 insight</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction();
            }}
            className="px-3 py-1 bg-white text-gray-900 text-xs font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  // Full Horizontal Bar
  return (
    <div
      className={`
        fixed top-0 left-1/2 -translate-x-1/2 z-40
        ${isExiting ? 'horizontal-exit' : 'horizontal-enter'}
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-[#0a0a0b] overflow-hidden shadow-2xl w-[600px]">
        {/* Progress bar */}
        <div className="h-[2px] bg-white/[0.03]">
          <div
            className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 ${colors.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} strokeWidth={1.5} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-0.5">
              {config.label}
            </p>
            <p className="text-white font-semibold">{insight.headline}</p>
            {insight.subtext && (
              <p className="text-white/40 text-sm">{insight.subtext}</p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleAction}
            className="px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            {insight.cta}
          </button>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
