'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Insight, KeyInsight, ActionableInsight, isKeyInsight, isActionableInsight } from './types';
import { SideBox } from './SideBox';
import { HorizontalBar } from './HorizontalBar';
import { WelcomeMoment } from './WelcomeMoment';
import { InsightCarousel } from './InsightCarousel';

interface InsightContextType {
  showInsight: (insight: Insight) => void;
  showWelcome: (insight: KeyInsight) => void;
  queueKeyInsight: (insight: KeyInsight) => void;
  dismissAll: () => void;
}

const InsightContext = createContext<InsightContextType | null>(null);

export const useInsight = () => {
  const ctx = useContext(InsightContext);
  if (!ctx) throw new Error('useInsight must be used within InsightProvider');
  return ctx;
};

// LocalStorage helpers
const SHOWN_KEY = 'insights_shown';
const wasRecentlyShown = (id: string): boolean => {
  try {
    const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}');
    const timestamp = shown[id];
    if (!timestamp) return false;
    const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursSince < 24;
  } catch {
    return false;
  }
};

const markShown = (id: string) => {
  try {
    const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}');
    shown[id] = Date.now();
    localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
  } catch {}
};

export const InsightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeKeyInsight, setActiveKeyInsight] = useState<KeyInsight | null>(null);
  const [activeActionable, setActiveActionable] = useState<ActionableInsight | null>(null);
  const [welcomeInsight, setWelcomeInsight] = useState<KeyInsight | null>(null);
  const [keyInsightQueue, setKeyInsightQueue] = useState<KeyInsight[]>([]);

  // Show single insight
  const showInsight = useCallback((insight: Insight) => {
    if (wasRecentlyShown(insight.id)) return;
    markShown(insight.id);

    if (isKeyInsight(insight)) {
      setActiveKeyInsight(insight);
    } else if (isActionableInsight(insight)) {
      setActiveActionable(insight);
    }
  }, []);

  // Show welcome moment
  const showWelcome = useCallback((insight: KeyInsight) => {
    if (wasRecentlyShown(insight.id)) return;
    markShown(insight.id);
    setWelcomeInsight(insight);
  }, []);

  // Queue for carousel
  const queueKeyInsight = useCallback((insight: KeyInsight) => {
    if (wasRecentlyShown(insight.id)) return;
    markShown(insight.id);
    setKeyInsightQueue((prev) => [...prev, insight]);
  }, []);

  const dismissAll = useCallback(() => {
    setActiveKeyInsight(null);
    setActiveActionable(null);
    setWelcomeInsight(null);
    setKeyInsightQueue([]);
  }, []);

  // Show carousel if queue has multiple items
  const showCarousel = keyInsightQueue.length >= 2;

  return (
    <InsightContext.Provider value={{ showInsight, showWelcome, queueKeyInsight, dismissAll }}>
      {children}

      {/* Welcome Moment - highest priority */}
      {welcomeInsight && (
        <WelcomeMoment
          insight={welcomeInsight}
          onComplete={() => setWelcomeInsight(null)}
        />
      )}

      {/* Horizontal Bar - actionable insights */}
      {activeActionable && !welcomeInsight && (
        <HorizontalBar
          insight={activeActionable}
          onDismiss={() => setActiveActionable(null)}
        />
      )}

      {/* Side Box or Carousel - key insights */}
      {!welcomeInsight && !activeActionable && (
        <>
          {showCarousel ? (
            <InsightCarousel
              insights={keyInsightQueue}
              onDismiss={() => setKeyInsightQueue([])}
            />
          ) : activeKeyInsight ? (
            <SideBox
              insight={activeKeyInsight}
              onDismiss={() => setActiveKeyInsight(null)}
            />
          ) : keyInsightQueue.length === 1 ? (
            <SideBox
              insight={keyInsightQueue[0]}
              onDismiss={() => setKeyInsightQueue([])}
            />
          ) : null}
        </>
      )}
    </InsightContext.Provider>
  );
};
