'use client';

import { useState } from 'react';
import { KeyInsight, INSIGHT_CONFIG } from './types';
import { TrendingUp, BarChart3, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './animations.css';

interface InsightCarouselProps {
  insights: KeyInsight[];
  onDismiss: () => void;
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

export const InsightCarousel: React.FC<InsightCarouselProps> = ({
  insights,
  onDismiss,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const currentInsight = insights[currentIndex];
  const config = INSIGHT_CONFIG[currentInsight.type];
  const colors = COLORS[config.accentColor];
  const Icon = ICONS[config.icon];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length);
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-40
        ${isExiting ? 'sidebox-exit' : 'sidebox-enter'}
      `}
    >
      <div className="bg-[#0a0a0b] rounded-2xl w-80 overflow-hidden shadow-2xl shadow-black/20">
        {/* Header with nav */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full animate-pulse-dot`} />
            <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
              Key Insights
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current insight */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">
                {currentInsight.metricLabel}
              </p>
              <p className="text-white text-2xl font-bold">{currentInsight.metric}</p>
              {currentInsight.headline && (
                <p className="text-white/50 text-sm">{currentInsight.headline}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with dots */}
        <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <p className="text-white/40 text-sm">{currentInsight.supportingStat}</p>
          <div className="flex items-center gap-1.5">
            {insights.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
