import type { Metadata } from 'next';
import { getFixedT } from '@goalspace/i18n/server';

import { requireSessionContext } from '@/lib/auth/session';
import { getUserSettings } from '@/lib/db/user-settings';
import { getLocale } from '@/lib/format';
import { timeZoneOptions } from '@/lib/settings/time-zones';
import { AccountForm } from './account-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = getFixedT(await getLocale());
  return { title: t('app.account.title') };
}

/**
 * Not project-scoped — `workspace-chrome.tsx` resolves the project from the
 * pathname, finds none here, and renders the wordmark instead of a section
 * title. This route lives behind the account control in the header rail, not
 * the sidebar, which is always project-scoped (PRODUCT.md §5).
 *
 * One page-level `<h1>`, matching every sibling settings page
 * (`projects/[slug]/settings/page.tsx`).
 */
export default async function AccountSettingsPage() {
  const { supabase, userId } = await requireSessionContext();
  const settings = await getUserSettings(supabase, userId);
  const t = getFixedT(await getLocale());

  // Built here, on the server, and passed down as a prop. The list runs to 419
  // entries, and the browser's ICU is not guaranteed to return the same set, so
  // computing it on both sides risks a hydration mismatch across hundreds of
  // <option> elements. `timeZoneOptions` adds the UTC that Intl omits — see its
  // comment; without it the stored default has no matching option at all.
  const timeZones = timeZoneOptions();

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="flex flex-col gap-10 pb-10 pt-8">
        <h1 className="label border-rule text-ink-soft border-b pb-2">{t('app.account.title')}</h1>

        <AccountForm settings={settings} timeZones={timeZones} />
      </div>
    </div>
  );
}
