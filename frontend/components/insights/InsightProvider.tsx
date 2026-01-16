'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WelcomeMoment } from './WelcomeMoment';
import { CommandBar } from './CommandBar';

interface Insight {
  id: string;
  priority: 'high' | 'normal';  // high = welcome moment, normal = command bar
  type: string;
  headline: string;
  metric?: string;
  metricLabel?: string;
  subtext?: string;
  cta?: string;
  onAction?: () => void;
}

interface InsightContextType {
  showInsight: (insight: Insight) => void;
  dismissInsight: () => void;
}

const InsightContext = createContext<InsightContextType | null>(null);

export const useInsight = () => {
  const context = useContext(InsightContext);
  if (!context) throw new Error('useInsight must be used within InsightProvider');
  return context;
};

// Check if insight was shown recently
const wasRecentlyShown = (id: string): boolean => {
  const shown = localStorage.getItem(`insight_shown_${id}`);
  if (!shown) return false;
  const timestamp = parseInt(shown, 10);
  const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
  return hoursSince < 24; // Don't show same insight within 24h
};

const markAsShown = (id: string) => {
  localStorage.setItem(`insight_shown_${id}`, Date.now().toString());
};

export const InsightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentInsight, setCurrentInsight] = useState<Insight | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  const showInsight = useCallback((insight: Insight) => {
    // Skip if recently shown
    if (wasRecentlyShown(insight.id)) return;

    setCurrentInsight(insight);
    markAsShown(insight.id);

    if (insight.priority === 'high') {
      setShowWelcome(true);
    } else {
      setShowCommand(true);
    }
  }, []);

  const dismissInsight = useCallback(() => {
    setShowWelcome(false);
    setShowCommand(false);
    setCurrentInsight(null);
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setShowWelcome(false);
    // Optionally show command bar after welcome
    if (currentInsight) {
      setTimeout(() => setShowCommand(true), 300);
    }
  }, [currentInsight]);

  return (
    <InsightContext.Provider value={{ showInsight, dismissInsight }}>
      {children}

      {/* Welcome Moment */}
      {showWelcome && currentInsight && (
        <WelcomeMoment
          type={currentInsight.type as any}
          metric={currentInsight.metric || ''}
          metricLabel={currentInsight.metricLabel || ''}
          subtitle={currentInsight.subtext || ''}
          onComplete={handleWelcomeComplete}
        />
      )}

      {/* Command Bar */}
      {showCommand && currentInsight && !showWelcome && (
        <CommandBar
          type={currentInsight.type as any}
          headline={currentInsight.headline}
          subtext={currentInsight.subtext}
          metric={currentInsight.metric}
          cta={currentInsight.cta}
          onAction={currentInsight.onAction}
          onDismiss={dismissInsight}
        />
      )}
    </InsightContext.Provider>
  );
};
