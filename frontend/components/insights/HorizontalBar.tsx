'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionableInsight, INSIGHT_CONFIG } from './types';
import { Zap, Calendar, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import './animations.css';

interface HorizontalBarProps {
  insight: ActionableInsight;
  onDismiss: () => void;
  duration?: number;
}

const ICONS = {
  'zap': Zap,
  'calendar': Calendar,
  'alert-triangle': AlertTriangle,
};

const COLORS = {
  violet: {
    gradient: 'from-violet-400 to-purple-400',
    iconBg: 'bg-violet-500/10',
    icon: 'text-violet-400',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-400',
    iconBg: 'bg-rose-500/10',
    icon: 'text-rose-400',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-400',
    iconBg: 'bg-amber-500/10',
    icon: 'text-amber-400',
  },
};

export const HorizontalBar: React.FC<HorizontalBarProps> = ({
  insight,
  onDismiss,
  duration = 10000,
}) => {
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

  // Progress timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 100));
        if (next <= 0) {
          handleDismiss();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, duration, handleDismiss]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleDismiss]);

  return (
    <div
      className={`
        fixed top-5 left-1/2 z-40
        ${isExiting ? 'horizontal-exit' : 'horizontal-enter'}
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-[#0a0a0b] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 max-w-xl">
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
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
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-0.5">
              {config.label}
            </p>
            <p className="text-white font-medium">{insight.headline}</p>
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
            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
