// frontend/app/components/MetricHelpButton.tsx
"use client";
import React from "react";

export default function MetricHelpButton() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls="metric-help"
        aria-label="Open: How to read these cards"
        className="
          inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md
          bg-black text-white hover:bg-zinc-900 active:bg-zinc-950
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40
          shadow-sm
        "
      >
        <span className="h-4 w-4 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-[10px] leading-none">
          i
        </span>
        <span>How to read these cards</span>
      </button>

      {open && (
        <div
          id="metric-help"
          role="dialog"
          aria-modal="false"
          className="absolute right-0 mt-2 w-[340px] rounded-xl bg-white shadow-2xl ring-1 ring-black/10 p-3 text-[13px] leading-5 z-40"
        >
          <div className="absolute -top-1 right-8 h-3 w-3 bg-white rotate-45 ring-1 ring-black/10" />
          <h4 className="font-semibold mb-2 text-gray-900">How to read these cards</h4>

          <ul className="space-y-2 text-gray-800">
            <li><span className="font-medium">Match %</span> — How closely this ZIP looks like your best patients (age, income, spend, travel). <em>Higher = better fit.</em></li>
            <li><span className="font-medium">Typical bookings</span> — Realistic new patients per month if you advertise here. <em>Example: “Typical 6” ≈ 6 new patients/month.</em></li>
            <li><span className="font-medium">Max CPA</span> <span className="text-gray-600">(Cost per Acquisition)</span> — Most you should pay for one new patient while staying profitable. <em className="block text-gray-600">Below this → scale; above this → fix targeting/creative.</em></li>
            <li><span className="font-medium">Monthly ad cap</span> — Recommended monthly budget limit for this ZIP. <em className="block text-gray-600">Hit “Typical bookings” first, then raise slowly.</em></li>
            <li><span className="font-medium">Competitors/10k</span> — Clinics per 10,000 residents. <em className="block text-gray-600">0 = wide-open; higher = more competition.</em></li>
            <li><span className="font-medium">Revenue potential</span> — Typical bookings × avg. first-visit value. <em className="block text-gray-600">Example: 6 × $684 ≈ $4,101/month.</em></li>
            <li><span className="font-medium">Distance (mi/min)</span> — How far patients travel. <em className="block text-gray-600">Longer trips = more no-shows → use deposits + double reminders.</em></li>
          </ul>

          <div className="mt-3 border-t pt-2 text-[12px] text-gray-600">
            <div className="font-semibold mb-1">Jargon → Simple</div>
            <div><span className="font-medium">CPA</span> = cost to get one new patient.</div>
            <div><span className="font-medium">ROAS</span> = revenue ÷ ad spend. <em>5× means $5 back for every $1.</em></div>
          </div>
        </div>
      )}
    </div>
  );
}

