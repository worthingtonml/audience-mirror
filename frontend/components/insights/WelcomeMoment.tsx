'use client';

import { useState, useEffect } from 'react';
import { KeyInsight, INSIGHT_CONFIG } from './types';
import { TrendingUp, BarChart3, Sparkles } from 'lucide-react';
import './animations.css';

interface WelcomeMomentProps {
  insight: KeyInsight;
  onComplete: () => void;
  duration?: number;
}

const ICONS = {
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'sparkles': Sparkles,
};

const COLORS = {
  emerald: 'from-emerald-500/5',
  blue: 'from-blue-500/5',
  amber: 'from-amber-500/5',
};

export const WelcomeMoment: React.FC<WelcomeMomentProps> = ({
  insight,
  onComplete,
  duration = 3500,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const config = INSIGHT_CONFIG[insight.type];
  const gradientColor = COLORS[config.accentColor];

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 100));
    }, duration / 100);

    // Exit after duration
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    // Complete after exit animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration + 400);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Skip on any key
  useEffect(() => {
    const handleKey = () => setIsExiting(true);
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0b]
        ${isExiting ? 'welcome-exit' : 'welcome-enter'}
      `}
    >
      {/* Subtle gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradientColor} via-transparent to-transparent`} />

      {/* Content */}
      <div className="relative text-center px-8 max-w-lg welcome-content-enter">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mb-8">
          <div className={`w-1.5 h-1.5 bg-${config.accentColor}-400 rounded-full animate-pulse-dot`} />
          <span className="text-white/60 text-xs font-medium uppercase tracking-wider">
            {config.label}
          </span>
        </div>

        {/* Metric */}
        <div className="mb-6">
          <p className="text-white/40 text-sm font-medium uppercase tracking-wider mb-3">
            {insight.metricLabel}
          </p>
          <p className="text-white text-6xl font-bold tracking-tight">
            {insight.metric}
          </p>
          {insight.headline && (
            <p className="text-white/60 text-xl font-medium mt-2">
              {insight.headline}
            </p>
          )}
        </div>

        {/* Supporting stat */}
        {insight.supportingStat && (
          <div className="flex items-center justify-center gap-2 text-white/40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm">{insight.supportingStat}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
        <div
          className="h-full bg-white/20 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
