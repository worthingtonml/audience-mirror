export const bannerTypes = {
  campaign_success: {
    label: 'Campaign Win',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    labelColor: 'text-emerald-600',
    headlineColor: 'text-emerald-900',
    subtextColor: 'text-emerald-700',
    buttonBg: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-700',
  },
  benchmark: {
    label: 'How You Compare',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    labelColor: 'text-blue-600',
    headlineColor: 'text-blue-900',
    subtextColor: 'text-blue-700',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
  market_signal: {
    label: 'Market Signal',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    labelColor: 'text-purple-600',
    headlineColor: 'text-purple-900',
    subtextColor: 'text-purple-700',
    buttonBg: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
  },
  timing: {
    label: 'Timing Opportunity',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    labelColor: 'text-rose-600',
    headlineColor: 'text-rose-900',
    subtextColor: 'text-rose-700',
    buttonBg: 'bg-rose-600',
    buttonHover: 'hover:bg-rose-700',
  },
  urgent: {
    label: 'Urgent',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    labelColor: 'text-amber-600',
    headlineColor: 'text-amber-900',
    subtextColor: 'text-amber-700',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
  },
  growth: {
    label: 'Growth Opportunity',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    labelColor: 'text-indigo-600',
    headlineColor: 'text-indigo-900',
    subtextColor: 'text-indigo-700',
    buttonBg: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-700',
  },
};

export type BannerType = keyof typeof bannerTypes;

export interface Insight {
  id: string;
  type: BannerType;
  headline: string;
  subtext: string;
  buttonText: string;
  metric?: string;
  metricLabel?: string;
}
