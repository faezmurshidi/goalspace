import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MoveRight, PhoneCall } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GoalForm } from '../goal-form';
import { BorderBeam } from './border-beam';
import { Card } from './card';

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => ['Learn', 'Build', 'Achieve', 'Succeed', 'Start'], []);

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
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-40">
          <div>
            <Button variant="secondary" size="sm" className="gap-4">
              Read our launch article <MoveRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="font-regular max-w-2xl text-center text-5xl tracking-tighter md:text-7xl">
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
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
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
              <span className="text-spektr-cyan-50">anything.</span>
            </h1>

            <p className="max-w-2xl text-center text-lg leading-relaxed tracking-tight text-muted-foreground md:text-xl">
              Transform your goals into reality with AI-powered mentorship and structured learning
              paths.
            </p>
          </div>
          <div className="w-full">
            <Card className="mx-auto mb-8 w-full max-w-2xl border-white/10 bg-white/5 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
              <div className="p-4">
                <GoalForm
                  onSubmit={async (answers) => {
                    // Handle form submission in the hero section
                    console.log('Hero form submission:', answers);
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
