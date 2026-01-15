'use client';

interface InsightBannerCollapsedProps {
  count: number;
  onExpand: () => void;
}

export function InsightBannerCollapsed({ count, onExpand }: InsightBannerCollapsedProps) {
  return (
    <button
      onClick={onExpand}
      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
        <span className="text-sm font-medium text-gray-700">
          {count} insight{count !== 1 ? 's' : ''} available
        </span>
      </div>
      <span className="text-sm text-indigo-600 font-medium">Show →</span>
    </button>
  );
}
