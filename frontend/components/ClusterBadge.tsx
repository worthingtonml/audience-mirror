'use client';

type ClusterBadgeProps = {
  cluster?: string;
  size?: 'sm' | 'md';
};

const CLUSTER_COLORS: Record<string, string> = {
  'Luxury Seekers': 'bg-violet-100 text-violet-700',
  'Affluent Wellness': 'bg-emerald-100 text-emerald-700',
  'Young Professionals': 'bg-blue-100 text-blue-700',
  'Budget Conscious': 'bg-amber-100 text-amber-700',
  'Premium Lifestyle': 'bg-rose-100 text-rose-700',
  'Unknown': 'bg-gray-100 text-gray-500',
};

export default function ClusterBadge({ cluster, size = 'sm' }: ClusterBadgeProps) {
  if (!cluster) return null;

  const colors = CLUSTER_COLORS[cluster] || CLUSTER_COLORS['Unknown'];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors} ${sizeClasses}`}>
      {cluster}
    </span>
  );
}
