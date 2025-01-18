// components/ui/activity-card.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, CheckCircle2, Plus, Target } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface Metric {
  label: string;
  value: string;
  trend: number;
  unit?: 'cal' | 'min' | 'hrs';
}

export interface Goal {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface ActivityCardProps {
  category?: string;
  title?: string;
  metrics?: Metric[];
  dailyGoals?: Goal[];
  onAddGoal?: () => void;
  onToggleGoal?: (goalId: string) => void;
  onViewDetails?: () => void;
  className?: string;
}

const METRIC_COLORS = {
  Move: '#FF2D55',
  Exercise: '#2CD758',
  Stand: '#007AFF',
} as const;

export function ActivityCard({
  category = 'Activity',
  title = "Today's Progress",
  metrics = [],
  dailyGoals = [],
  onAddGoal,
  onToggleGoal,
  onViewDetails,
  className,
}: ActivityCardProps) {
  const [isHovering, setIsHovering] = useState<string | null>(null);

  const handleGoalToggle = (goalId: string) => {
    onToggleGoal?.(goalId);
  };

  return (
    <div
      className={cn(
        'relative h-full rounded-3xl p-6',
        'bg-white dark:bg-black/5',
        'border border-zinc-200 dark:border-zinc-800',
        'hover:border-zinc-300 dark:hover:border-zinc-700',
        'transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800/50">
          <Activity className="h-5 w-5 text-[#FF2D55]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{category}</p>
        </div>
      </div>

      {/* Metrics Rings */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className="relative flex flex-col items-center"
            onMouseEnter={() => setIsHovering(metric.label)}
            onMouseLeave={() => setIsHovering(null)}
          >
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800/50" />
              <div
                className={cn(
                  'absolute inset-0 rounded-full border-4 transition-all duration-500',
                  isHovering === metric.label && 'scale-105'
                )}
                style={{
                  borderColor: METRIC_COLORS[metric.label as keyof typeof METRIC_COLORS],
                  clipPath: `polygon(0 0, 100% 0, 100% ${metric.trend}%, 0 ${metric.trend}%)`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-zinc-900 dark:text-white">
                  {metric.value}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{metric.unit}</span>
              </div>
            </div>
            <span className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {metric.label}
            </span>
            <span className="text-xs text-zinc-500">{metric.trend}%</span>
          </div>
        ))}
      </div>

      {/* Goals Section */}
      <div className="mt-8 space-y-6">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-800" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Target className="h-4 w-4" />
              Today's Goals
            </h4>
            <button
              type="button"
              onClick={onAddGoal}
              className="rounded-full p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          <div className="space-y-2">
            {dailyGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleGoalToggle(goal.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-3',
                  'bg-zinc-50 dark:bg-zinc-900/50',
                  'border border-zinc-200/50 dark:border-zinc-800/50',
                  'hover:border-zinc-300/50 dark:hover:border-zinc-700/50',
                  'transition-all'
                )}
              >
                <CheckCircle2
                  className={cn(
                    'h-5 w-5',
                    goal.isCompleted ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-600'
                  )}
                />
                <span
                  className={cn(
                    'text-left text-sm',
                    goal.isCompleted
                      ? 'text-zinc-500 line-through dark:text-zinc-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {goal.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            onClick={onViewDetails}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            View Activity Details
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}