import * as React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  strokeWidth = 4,
  className,
  ...props
}: CircularProgressProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = value != null ? circumference - (value / 100) * circumference : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      className={cn('relative', className)}
      {...props}
    >
      <svg
        className="h-full w-full -rotate-90 transform"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle
          className="stroke-slate-200 dark:stroke-slate-700"
          fill="none"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className={cn(
            'transition-all duration-500 ease-in-out',
            value != null
              ? 'stroke-primary'
              : 'animate-spin stroke-primary/50'
          )}
          fill="none"
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
} 