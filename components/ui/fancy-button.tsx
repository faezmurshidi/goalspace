import * as React from 'react';
import { cn } from '@/lib/utils';

interface FancyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  textColor?: string;
  fillColors?: {
    top: string;
    middle: string;
    bottom: string;
  };
  stroke?: {
    color: string;
    opacity: number;
    width: number;
  };
  dropShadow?: {
    color: string;
    opacity: number;
    x: number;
    y: number;
    blur: number;
    spread: number;
  };
  innerShadow?: {
    color: string;
    opacity: number;
    x: number;
    y: number;
    blur: number;
    spread: number;
  };
  children?: React.ReactNode;
}

export function FancyButton({
  text,
  textColor = '#FFFFFF',
  fillColors = {
    top: '#52525B',
    middle: '#3F3F46',
    bottom: '#27272A',
  },
  stroke = {
    color: '#0B0B0D',
    opacity: 0.75,
    width: 0.5,
  },
  dropShadow = {
    color: '#18181B',
    opacity: 0.25,
    x: 0,
    y: 1,
    blur: 2,
    spread: 0,
  },
  innerShadow = {
    color: '#D4D4D8',
    opacity: 0.55,
    x: 0,
    y: 1,
    blur: 1,
    spread: 0,
  },
  className,
  children,
  ...props
}: FancyButtonProps) {
  // Generate unique IDs for each instance
  const id = React.useId();
  const gradientId = `gradient-${id}`;
  const dropShadowId = `drop-shadow-${id}`;
  const innerShadowId = `inner-shadow-${id}`;

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg px-6 py-3 font-medium transition-colors",
        "hover:opacity-90 active:opacity-100",
        className
      )}
      style={{
        color: textColor,
        filter: `drop-shadow(${dropShadow.x}px ${dropShadow.y}px ${dropShadow.blur}px ${dropShadow.color}${Math.round(dropShadow.opacity * 255).toString(16).padStart(2, '0')})`,
      }}
      {...props}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={fillColors.top} />
            <stop offset="50%" stopColor={fillColors.middle} />
            <stop offset="100%" stopColor={fillColors.bottom} />
          </linearGradient>
          <filter id={dropShadowId}>
            <feDropShadow
              dx={dropShadow.x}
              dy={dropShadow.y}
              stdDeviation={dropShadow.blur / 2}
              floodColor={dropShadow.color}
              floodOpacity={dropShadow.opacity}
            />
          </filter>
          <filter id={innerShadowId}>
            <feOffset
              dx={innerShadow.x}
              dy={innerShadow.y}
            />
            <feGaussianBlur
              stdDeviation={innerShadow.blur / 2}
              result="offset-blur"
            />
            <feComposite
              operator="out"
              in="SourceGraphic"
              in2="offset-blur"
              result="inverse"
            />
            <feFlood
              floodColor={innerShadow.color}
              floodOpacity={innerShadow.opacity}
              result="color"
            />
            <feComposite
              operator="in"
              in="color"
              in2="inverse"
              result="shadow"
            />
            <feComposite
              operator="over"
              in="shadow"
              in2="SourceGraphic"
            />
          </filter>
        </defs>
        <rect
          x={stroke.width}
          y={stroke.width}
          width={`calc(100% - ${stroke.width * 2}px)`}
          height={`calc(100% - ${stroke.width * 2}px)`}
          rx="8"
          fill={`url(#${gradientId})`}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeOpacity={stroke.opacity}
          filter={`url(#${innerShadowId})`}
        />
      </svg>
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {text}
      </span>
    </button>
  );
} 