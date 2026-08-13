import type { Config } from 'tailwindcss';
import preset from '@goalspace/config/tailwind/preset';

export default {
  presets: [preset],
  content: [
    './pages/**/*.{js,jsx,ts,tsx,mdx}',
    './components/**/*.{js,jsx,ts,tsx,mdx}',
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './src/**/*.{js,jsx,ts,tsx,mdx}',
    './lib/**/*.{js,jsx,ts,tsx,mdx}',
    './utils/**/*.{js,jsx,ts,tsx,mdx}',
  ],
} satisfies Config;
