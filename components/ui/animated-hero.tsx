'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, MoveRight, PhoneCall, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { GoalForm } from '../goal-form';
import { BorderBeam } from './border-beam';
import { Card } from './card';

function Hero() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ['Learn', 'Build', 'Achieve', 'Succeed', 'Start'], []);
  const heroRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(heroRef, { once: true });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div ref={heroRef} className="w-full">
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 items-center gap-16 md:grid-cols-2">
        {/* Left Column: Hero Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-8 py-6 md:py-8 text-center md:items-start md:text-left"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Button 
              asChild 
              className="gap-2 px-4 py-2 text-sm font-medium rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 border-none"
            >
              <Link href={`/${locale}/blog/getting-started`}>
                {t('hero.launchArticle')} <MoveRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </motion.div>
          
          <div className="flex flex-col gap-6">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-regular max-w-xl text-5xl tracking-tighter md:text-6xl lg:text-7xl"
            >
              <span className="relative flex w-full overflow-hidden md:pb-2 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: '-100' }}
                    transition={{ type: 'spring', stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -120 : 120,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="text-primary">{t('hero.anything')}</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-xl text-lg leading-relaxed tracking-tight text-muted-foreground md:text-xl"
            >
              {t('hero.description')}
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <Button className="px-6 py-3 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-white">
              {t('hero.getStarted')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button className="px-6 py-3 text-base font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200">
              <Play className="h-4 w-4 mr-2" /> {t('hero.watchDemo')}
            </Button>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-3 text-sm text-muted-foreground mt-4"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gray-200 dark:border-gray-800" />
              ))}
            </div>
            <span>{t('hero.joinUsers')}</span>
          </motion.div>
        </motion.div>

        {/* Right Column: Form Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="w-full"
        >
          <Card className="mx-auto mb-8 w-full border-white/10 bg-white/90 shadow-xl ring-1 ring-white/20 backdrop-blur-xl dark:bg-gray-900/80">
            <div className="relative overflow-hidden rounded-lg">
              {/* Glowing effect */}
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />
              
              <div className="relative p-6 md:p-8">
                <h3 className="mb-3 text-xl font-bold">{t('hero.enterGoal')}</h3>
                <p className="mb-6 text-muted-foreground">
                  {t('hero.goalDescription')}
                </p>
                <GoalForm/>
                
                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                  <span className="text-muted-foreground">{t('hero.noSignup')}</span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    {t('hero.itsFree')} <span className="rounded-full bg-primary/10 px-2 py-1 text-xs">Beta</span>
                  </span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Features list */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-3"
          >
            {[
              t('hero.features.personalizedSpaces'), 
              t('hero.features.aiMentorship'), 
              t('hero.features.goalTracking'), 
              t('hero.features.structuredLearning'), 
              t('hero.features.communitySupport'), 
              t('hero.features.adaptiveContent')
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-primary shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export { Hero };
