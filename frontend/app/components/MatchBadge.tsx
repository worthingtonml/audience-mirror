import React from "react";

interface MatchBadgeProps {
  score: number; // 0-1 decimal
}

export default function MatchBadge({ score }: MatchBadgeProps) {
  const pct = Math.round(score * 100);
  let bg = "";
  let color = "";
  if (pct >= 67) {
    bg = "bg-emerald-100";
    color = "text-emerald-700";
  } else if (pct >= 34) {
  bg = "bg-primary-100";
  color = "text-primary-700";
  } else {
    bg = "bg-gray-200";
    color = "text-gray-700";
  }
  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-lg px-3 py-2 ${bg}`}
      aria-label={`Match score: ${pct} percent`}
      title={`Match score: ${pct}%`}
      style={{ minWidth: 60 }}
    >
      <span className={`text-xl font-bold leading-none ${color}`}>{pct}%</span>
      <span className="text-xs text-gray-500 leading-none mt-1">Match</span>
    </div>
  );
}
