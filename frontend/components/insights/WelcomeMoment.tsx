'use client';

import { useEffect, useState } from 'react';
import './animations.css';

interface WelcomeMomentProps {
  type: 'milestone' | 'big_win' | 'first_visit';
  metric: string;        // e.g., "$4,120"
  metricLabel: string;   // e.g., "recovered"
  subtitle: string;      // e.g., "11 patients came back"
  onComplete: () => void;
  duration?: number;     // ms, default 3000
}

const GRADIENTS = {
  milestone: 'from-slate-900 via-slate-800 to-slate-900',
  big_win: 'from-emerald-600 via-teal-600 to-cyan-600',
  first_visit: 'from-violet-600 via-purple-600 to-indigo-600',
};

const LABELS = {
  milestone: '🎉 Milestone',
  big_win: 'Campaign Win',
  first_visit: 'Welcome',
};

export const WelcomeMoment: React.FC<WelcomeMomentProps> = ({
  type,
  metric,
  metricLabel,
  subtitle,
  onComplete,
  duration = 3000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration + 500); // Wait for exit animation

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  useEffect(() => {
    const handleKeyDown = () => {
      setIsExiting(true);
      setTimeout(onComplete, 500);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-gradient-to-br ${GRADIENTS[type]} animated-gradient
        ${isExiting ? 'welcome-exit' : 'welcome-enter'}
      `}
    >
      <div className="text-center welcome-content-enter">
        {/* Label */}
        <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-4">
          {LABELS[type]}
        </p>

        {/* Big metric */}
        <p className="text-white text-6xl md:text-7xl font-extrabold welcome-metric-enter">
          {metric}
        </p>

        {/* Metric label */}
        <p className="text-white/80 text-xl md:text-2xl font-medium mt-2">
          {metricLabel}
        </p>

        {/* Subtitle */}
        <div className="mt-8 flex items-center justify-center gap-2 text-white/60">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="font-medium">{subtitle}</span>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={() => setIsExiting(true)}
        className="absolute bottom-8 text-white/40 text-sm hover:text-white/60 transition-colors"
      >
        Press any key to continue
      </button>
    </div>
  );
};
