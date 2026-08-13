import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const uiPkg = JSON.parse(
  readFileSync(new URL('../../../../packages/ui/package.json', import.meta.url), 'utf8')
);
const i18nPkg = JSON.parse(
  readFileSync(new URL('../../../../packages/i18n/package.json', import.meta.url), 'utf8')
);

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

  it('shared packages declare no supabase dependency', () => {
    for (const [name, sharedPkg] of [
      ['@goalspace/ui', uiPkg],
      ['@goalspace/i18n', i18nPkg],
    ] as const) {
      const deps = { ...sharedPkg.dependencies, ...sharedPkg.devDependencies };
      const supabase = Object.keys(deps).filter((d) => d.startsWith('@supabase/') || d === 'supabase');
      expect(supabase, `${name} declares a supabase dependency`).toEqual([]);
    }
  });

  it('imports nothing from supabase in any source file', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const offenders = sourceFiles(root).filter((file) =>
      /@supabase\/|utils\/supabase/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('imports nothing from supabase in the shared packages (packages/ui, packages/i18n)', () => {
    // apps/web and apps/app both consume packages/ui and packages/i18n via
    // transpilePackages, so a Supabase import added to a shared package
    // flows straight into the landing bundle even though apps/web itself
    // stays clean. This assertion is what actually catches that case.
    const uiRoot = fileURLToPath(new URL('../../../../packages/ui/src', import.meta.url));
    const i18nRoot = fileURLToPath(new URL('../../../../packages/i18n/src', import.meta.url));
    const offenders = [...sourceFiles(uiRoot), ...sourceFiles(i18nRoot)].filter((file) =>
      /@supabase\/|utils\/supabase/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders, `supabase import found in shared package file(s): ${offenders.join(', ')}`).toEqual([]);
  });
});
