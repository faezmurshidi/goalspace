import type { Config } from 'tailwindcss';
import preset from '@goalspace/config/tailwind/preset';

export default {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/*/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
