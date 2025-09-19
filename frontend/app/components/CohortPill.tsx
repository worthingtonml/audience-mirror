import React from "react";

interface CohortPillProps {
  label: string;
}



// Distinct, soft colors for each cohort (avoid blue/emerald/gray used by MatchBadge)
const cohortColors: Record<string, string> = {
  "Urban Pros": "bg-purple-50 text-purple-700 border-purple-200",
  "Luxury Suburbs": "bg-orange-50 text-orange-700 border-orange-200",
  "Emerging Affluents": "bg-teal-50 text-teal-700 border-teal-200",
  "Suburban Families": "bg-rose-50 text-rose-700 border-rose-200",
  "Dense Blue-Collar": "bg-slate-100 text-slate-700 border-slate-300",
};

const cohortDescriptions: Record<string, string> = {
  "Urban Pros": "High-income professionals in dense urban areas.",
  "Luxury Suburbs": "Affluent families in upscale residential areas.",
  "Emerging Affluents": "Young, upwardly mobile households in growing neighborhoods.",
  "Suburban Families": "Middle-class families in established suburban communities.",
  "Dense Blue-Collar": "Working-class residents in high-density, blue-collar neighborhoods.",
};

export default function CohortPill({ label }: CohortPillProps) {
  const color = cohortColors[label] || "bg-slate-50 text-gray-700 border-gray-200";
  const description = cohortDescriptions[label] || "Demographic segment";
  return (
    <span className="relative group">
      <span
        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${color}`}
        aria-label={`Cohort: ${label}`}
        tabIndex={0}
      >
        {label}
      </span>
      <span className="absolute left-1/2 z-20 -translate-x-1/2 mt-2 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg whitespace-normal text-center select-none">
        {description}
      </span>
    </span>
  );
}
