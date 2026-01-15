export const bannerTypes = {
  benchmark: {
    bg: 'bg-gray-900',
    eyebrowColor: 'text-gray-400',
    subtextColor: 'text-gray-400',
    buttonText: 'text-gray-900',
    buttonBg: 'bg-white',
    buttonHover: 'hover:bg-gray-50',
  },
  trend: {
    bg: 'bg-violet-600',
    eyebrowColor: 'text-violet-200',
    subtextColor: 'text-violet-100',
    buttonText: 'text-violet-600',
    buttonBg: 'bg-white',
    buttonHover: 'hover:bg-violet-50',
  },
  seasonal: {
    bg: 'bg-rose-500',
    eyebrowColor: 'text-rose-100',
    subtextColor: 'text-rose-100',
    buttonText: 'text-rose-600',
    buttonBg: 'bg-white',
    buttonHover: 'hover:bg-rose-50',
  },
  success: {
    bg: 'bg-emerald-500',
    eyebrowColor: 'text-emerald-100',
    subtextColor: 'text-emerald-100',
    buttonText: 'text-emerald-600',
    buttonBg: 'bg-white',
    buttonHover: 'hover:bg-emerald-50',
  },
  competitive: {
    bg: 'bg-amber-500',
    eyebrowColor: 'text-amber-100',
    subtextColor: 'text-amber-100',
    buttonText: 'text-amber-600',
    buttonBg: 'bg-white',
    buttonHover: 'hover:bg-amber-50',
  },
};

export type BannerType = keyof typeof bannerTypes;

export interface Insight {
  id: string;
  type: BannerType;
  eyebrow: string;
  headline: string;
  subtext: string;
  buttonText: string;
  stat?: string;
  statLabel?: string;
}
