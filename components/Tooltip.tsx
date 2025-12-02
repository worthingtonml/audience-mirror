"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export function Tooltip({ text, children }: { text: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1 inline-flex items-center text-slate-400 hover:text-slate-600 transition-colors"
      >
        {children || <Info className="h-4 w-4" />}
      </button>
      
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-white bg-slate-900 rounded-lg shadow-lg">
          <div className="relative">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}
    </div>
  );
}