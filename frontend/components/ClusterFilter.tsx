'use client';

type ClusterFilterProps = {
  selected: string[];
  onChange: (clusters: string[]) => void;
};

const CLUSTERS = [
  'Luxury Seekers',
  'Affluent Wellness',
  'Young Professionals',
  'Budget Conscious',
  'Premium Lifestyle',
];

export default function ClusterFilter({ selected, onChange }: ClusterFilterProps) {
  const toggleCluster = (cluster: string) => {
    if (selected.includes(cluster)) {
      onChange(selected.filter(c => c !== cluster));
    } else {
      onChange([...selected, cluster]);
    }
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange([...CLUSTERS]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Filter by Psychographic Segment
        </label>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-violet-600 hover:text-violet-700"
          >
            Select All
          </button>
          {selected.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {CLUSTERS.map(cluster => {
          const isSelected = selected.includes(cluster);
          return (
            <button
              key={cluster}
              onClick={() => toggleCluster(cluster)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isSelected
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
              }`}
            >
              {cluster}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-gray-500">
          {selected.length} segment{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
