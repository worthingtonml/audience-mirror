'use client';

import { useEffect, useState, useCallback } from 'react';
import './animations.css';

interface CommandBarProps {
  type: 'campaign_win' | 'benchmark' | 'market_signal' | 'timing' | 'urgent';
  headline: string;
  subtext?: string;
  metric?: string;
  cta?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number; // ms, default 10000
}

const CONFIG = {
  campaign_win: {
    icon: '📈',
    gradient: 'from-emerald-500 to-teal-500',
    label: 'Campaign Win',
  },
  benchmark: {
    icon: '📊',
    gradient: 'from-blue-500 to-indigo-500',
    label: 'How You Compare',
  },
  market_signal: {
    icon: '⚡',
    gradient: 'from-violet-500 to-purple-500',
    label: 'Market Signal',
  },
  timing: {
    icon: '📅',
    gradient: 'from-rose-500 to-pink-500',
    label: 'Timing',
  },
  urgent: {
    icon: '⚠️',
    gradient: 'from-amber-500 to-orange-500',
    label: 'Urgent',
  },
};

export const CommandBar: React.FC<CommandBarProps> = ({
  type,
  headline,
  subtext,
  metric,
  cta,
  onAction,
  onDismiss,
  duration = 10000,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);

  const config = CONFIG[type];

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 300); // Wait for exit animation
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          handleDismiss();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, handleDismiss]);

  // Keyboard dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  const progressWidth = (timeRemaining / duration) * 100;

  return (
    <div
      className={`
        fixed top-6 left-1/2 z-40
        ${isExiting ? 'command-exit' : 'command-enter'}
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden min-w-[400px] max-w-[500px]">
        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <div
            className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-100 ease-linear`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Icon */}
          <div className={`w-11 h-11 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center flex-shrink-0 subtle-float`}>
            <span className="text-xl">{config.icon}</span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              {config.label}
            </p>
            <p className="text-white font-semibold truncate">{headline}</p>
            {subtext && (
              <p className="text-gray-400 text-sm truncate">{subtext}</p>
            )}
          </div>

          {/* Metric or CTA */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {metric && (
              <span className="text-2xl font-bold text-white">{metric}</span>
            )}
            {cta && onAction && (
              <button
                onClick={onAction}
                className="px-4 py-2 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                {cta}
              </button>
            )}
            {!cta && (
              <button
                onClick={onAction || handleDismiss}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                View →
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Hover hint */}
      {isPaused && (
        <p className="text-center text-gray-500 text-xs mt-2 animate-fadeIn">
          Paused · Press Esc to dismiss
        </p>
      )}
    </div>
  );
};
