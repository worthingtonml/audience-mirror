import React from 'react';

export default function SquareLogo() {
  const uid = React.useId();
  
  return (
    <svg width="32" height="32" viewBox="0 0 72 72" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`sq-gradient-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect 
        x="0" 
        y="0" 
        width="72" 
        height="72" 
        rx="12" 
        fill="currentColor" 
        className="text-white dark:text-[#0B0F1A]" 
      />
      <rect
        x="9"
        y="9"
        width="54"
        height="54"
        rx="12"
        fill="none"
        stroke={`url(#sq-gradient-${uid})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}