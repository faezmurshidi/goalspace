import preset from '@goalspace/config/tailwind/preset';
import type { Config } from 'tailwindcss';

export default {
  presets: [preset],
  content: [
    './pages/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './lib/**/*.{js,jsx,ts,tsx,mdx}',
    './utils/**/*.{js,jsx,ts,tsx,mdx}',
    './packages/*/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
