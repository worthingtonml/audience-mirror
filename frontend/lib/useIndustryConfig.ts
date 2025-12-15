// lib/useIndustryConfig.ts
import { useMemo } from 'react';
import { getIndustryConfig, formatMetricValue, IndustryConfig } from './industryConfig';

export function useIndustryConfig(vertical: string) {
  const config = useMemo(() => getIndustryConfig(vertical), [vertical]);
  
  const terms = useMemo(() => ({
    customer: config.entityLabels.singular,
    customers: config.entityLabels.plural,
    Customer: config.entityLabels.singular.charAt(0).toUpperCase() + config.entityLabels.singular.slice(1),
    Customers: config.entityLabels.plural.charAt(0).toUpperCase() + config.entityLabels.plural.slice(1),
  }), [config]);
  
  const formatMetric = (key: string, data: any) => {
    const metric = config.heroMetrics.find(m => m.key === key);
    if (!metric) return '—';
    
    const value = metric.formula(data);
    if (typeof value === 'string') return value;
    return formatMetricValue(value as number, metric.format);
  };
  
  return {
    config,
    terms,
    formatMetric,
    isMortgage: vertical === 'mortgage',
    isRealEstate: vertical === 'real_estate' || vertical === 'real_estate_mortgage',
    isMedspa: vertical === 'medspa',
  };
}
