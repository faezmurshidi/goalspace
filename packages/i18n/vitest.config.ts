import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // `node`, deliberately, not `jsdom`. `src/i18n.ts` branches on
    // `typeof window !== 'undefined'` to decide between the browser setup
    // (LanguageDetector + http backend) and the plain server setup, and
    // these tests exist to pin down what the *server* renders. Under jsdom
    // the singleton would take the browser branch and the tests would stop
    // exercising the path they are here to guard.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
