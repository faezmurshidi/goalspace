import { MainNav } from '@/components/main-nav';
import { ModeToggle } from '@/components/mode-toggle';
import LanguageSelector from '@/components/language-selector';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Brain } from 'lucide-react';
import { useAppTranslations } from '@/lib/hooks/use-translations';

export function SiteHeader() {
  const { t, currentLocale } = useAppTranslations();
  
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
            <Link href={`/${currentLocale}`} className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-rose-500" />
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500">
                {t('common.appName')}
              </span>
            </Link>
          </motion.div>

          {/* Navigation and Actions */}
          <div className="flex items-center space-x-2">
            <MainNav />
            <LanguageSelector />
            <ModeToggle />
          </div>
        </div>
      </div>
    </motion.header>
  );
}