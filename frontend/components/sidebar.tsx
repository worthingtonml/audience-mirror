"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, TrendingUp, Sparkles, Settings, BarChart3 } from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Patient Retention", href: "/patient-insights", icon: TrendingUp },
  { name: "Performance", href: "/performance", icon: BarChart3 },
  { name: "Find New Patients", href: "/campaign-generator", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [practiceName, setPracticeName] = useState('Practice Name');
  const [practiceInitial, setPracticeInitial] = useState('P');

  // Load practice name after component mounts (client-side only)
  useEffect(() => {
    const name = localStorage.getItem('practiceName');
    if (name) {
      setPracticeName(name);
      setPracticeInitial(name.charAt(0).toUpperCase());
    }
  }, []);

  return (
    <div className="hidden lg:flex h-screen w-56 flex-col bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700" />
          <span className="text-sm font-semibold text-slate-900">Audience Mirror</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium 
                transition-all duration-200 ease-out
                ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100/50"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <item.icon 
                className={`
                  h-4 w-4 transition-all duration-200
                  ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}
                `}
                strokeWidth={1.5}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
            {practiceInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">
              {practiceName}
            </div>
            <Link href="/settings" className="text-xs text-slate-500 hover:text-indigo-600">
              View settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
