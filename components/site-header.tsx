import { MainNav } from '@/components/main-nav';
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Brain } from 'lucide-react';

export function SiteHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 z-50 w-full"
    >
      <div className="absolute inset-0 bg-background/20 backdrop-blur-xl" />
      <div className="container relative mx-auto">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo and Brand */}
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

          {/* Navigation and Actions */}
          <div className="flex items-center gap-6">
            {/* Main Navigation */}
            <nav className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Pricing
              </Link>
              <MainNav />
            </nav>

            {/* Theme Toggle */}
            <div className="flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}