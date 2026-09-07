import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The RLS suite runs one file at a time.
 *
 * These tests are the security regression gate, and a gate that fails for
 * reasons unrelated to the code teaches people to re-run it rather than read
 * it. That is what was happening: fifteen files starting at once each create
 * test users through GoTrue and open their own Postgres connections, and on a
 * cold or just-woken machine the burst is enough that several files fail in
 * `beforeAll` — not one assertion, but whole files unable to reach the
 * database. A warm re-run then passes, which is exactly the shape that trains
 * you to ignore a red suite.
 *
 * Serialising costs wall-clock and buys a signal that means something. Unit
 * tests keep the default parallelism: they touch no database, so they have
 * nothing to contend over.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
