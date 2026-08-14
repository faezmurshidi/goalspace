import type { Config } from 'tailwindcss';
import preset from '@goalspace/config/tailwind/preset';

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/i18n/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-shade': 'var(--color-paper-shade)',
        'paper-soft': 'var(--color-paper-soft)',
        ink: 'var(--color-ink)',
        'ink-soft': 'var(--color-ink-soft)',
        rule: 'var(--color-rule)',
        oxide: 'var(--color-oxide)',
        'oxide-deep': 'var(--color-oxide-deep)',
        waiting: 'var(--color-waiting)',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'Helvetica Neue', 'sans-serif'],
        mono: ['var(--font-azeret)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 6.5vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.02em', fontWeight: '800' }],
        headline: ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.01em', fontWeight: '700' }],
        title: ['1.25rem', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['1.0625rem', { lineHeight: '1.6' }],
        label: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      borderRadius: {
        none: '0px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
} satisfies Config;
