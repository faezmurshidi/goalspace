import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.turbo' || entry === 'tests')
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe('marketing site boundaries', () => {
  it('declares no supabase dependency', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const supabase = Object.keys(deps).filter((d) => d.startsWith('@supabase/') || d === 'supabase');
    expect(supabase).toEqual([]);
  });

  it('imports nothing from supabase in any source file', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const offenders = sourceFiles(root).filter((file) =>
      /@supabase\/|utils\/supabase/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
