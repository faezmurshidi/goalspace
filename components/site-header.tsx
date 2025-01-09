import { MainNav } from '@/components/main-nav';
import { ModeToggle } from '@/components/mode-toggle';
import { motion } from 'framer-motion';

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
          <MainNav />
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-6">
              <a
                href="/pricing"
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Pricing
              </a>
              <a
                href="/dashboard"
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                Dashboard
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}