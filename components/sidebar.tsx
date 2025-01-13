'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Target,
  Settings,
  User,
  BarChart,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: Target,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart,
  },
  {
    title: 'AI Tools',
    href: '/ai-tools',
    icon: Sparkles,
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ className, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12 min-h-screen bg-background/95 backdrop-blur-md border-r border-border/40', className)}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-10 top-4 h-8 w-8 rounded-full bg-background/95 backdrop-blur-md border border-border/40"
        onClick={onToggle}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", !isOpen && "rotate-180")} />
      </Button>

      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-4 px-4 text-xl font-semibold tracking-tight">
              Navigation
            </h2>
           
          </div>
        </div>
      </div>
    </div>
  );
} 