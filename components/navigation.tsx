// components/navigation.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Sparkles, Home } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/patient-insights', label: 'Patient Intelligence', icon: BarChart3 },
    { href: '/campaign-intel', label: 'Campaign Generator', icon: Sparkles },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}