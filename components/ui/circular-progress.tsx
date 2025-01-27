import * as React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.SVGProps<SVGSVGElement> {
  value: number;
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  strokeWidth = 2,
  className,
  ...props
}: CircularProgressProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      className={cn("h-24 w-24 -rotate-90", className)}
      viewBox="0 0 100 100"
      {...props}
    >
      <circle
        className="stroke-slate-200 dark:stroke-slate-800"
        fill="none"
        strokeWidth={strokeWidth}
        r={radius}
        cx="50"
        cy="50"
      />
      <circle
        className="stroke-slate-600 dark:stroke-slate-400 transition-all duration-500 ease-in-out"
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={radius}
        cx="50"
        cy="50"
      />
    </svg>
  );
} 