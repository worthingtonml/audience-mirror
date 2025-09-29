import React from 'react';
import { Sun, Moon } from 'lucide-react';
import SquareLogo from './SquareLogo';
import { BRAND_GRADIENT } from '../lib/constants';
import { ThemeType } from '../lib/types';

interface InsightsHeaderProps {
  onNewAnalysis: () => void;
  theme: ThemeType;
  onToggleTheme: () => void;
}

export default function InsightsHeader({ onNewAnalysis, theme, onToggleTheme }: InsightsHeaderProps) {
  return (
    <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SquareLogo />
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: BRAND_GRADIENT }}
              >
                Audience Mirror
              </h1>
              <p className="text-sm text-gray-600 dark:text-white/60">Premium data-driven intelligence</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onNewAnalysis}
              className="inline-flex items-center px-4 py-2 rounded-xl text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              style={{ background: BRAND_GRADIENT }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Analysis
            </button>
            <button
              onClick={onToggleTheme}
              className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center transition-all"
              aria-label="Toggle theme"
            >
              <Sun className={`h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
              <Moon className={`absolute h-5 w-5 transition-all ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
