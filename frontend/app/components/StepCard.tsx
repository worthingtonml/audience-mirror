import React from 'react';
import { BRAND_GRADIENT } from '../lib/constants';

interface StepCardProps {
  number: string;
  title: string;
  desc: string;
}

export default function StepCard({ number, title, desc }: StepCardProps) {
  return (
    <div className="relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-sm hover:shadow-lg dark:hover:bg-white/[0.06] transition-all backdrop-blur-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div 
          className="flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm"
          style={{ background: BRAND_GRADIENT }}
        >
          {number}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed">{desc}</p>
    </div>
  );
}