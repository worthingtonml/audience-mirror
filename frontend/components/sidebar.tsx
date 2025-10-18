"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Sparkles, Settings } from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Patient Intelligence", href: "/patient-insights", icon: BarChart3 },
  { name: "Campaign Generator", href: "/campaign-generator", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex h-screen w-64 flex-col bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-6">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700" />
          <span className="text-sm font-semibold text-slate-900">Audience Mirror</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <item.icon 
                className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}
                strokeWidth={2}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">Practice Name</div>
            <div className="text-xs text-slate-500">View profile</div>
          </div>
        </div>
      </div>
    </div>
  );
}