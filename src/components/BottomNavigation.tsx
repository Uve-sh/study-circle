'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart3, Clock, Settings } from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/circle', icon: Users, label: 'Circle' },
    { href: '/stats', icon: BarChart3, label: 'Stats' },
    { href: '/schedule', icon: Clock, label: 'Schedule' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[430px] h-[80px] bg-[#111111] border-t border-[#222222] z-50 px-4 pb-safe flex justify-between items-center">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex flex-col items-center justify-center w-full h-full gap-1"
          >
            <Icon 
              size={24} 
              className={isActive ? "text-[#FFFFFF]" : "text-[#A0A0A0]"}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span 
              className={`text-[10px] font-medium ${isActive ? "text-[#FFFFFF]" : "text-[#A0A0A0]"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
