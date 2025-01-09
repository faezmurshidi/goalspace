'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-2"
      >
        <Link href="/" className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-rose-500" />
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500">
            GoalSpace
          </span>
        </Link>
      </motion.div>
    </div>
  );
}