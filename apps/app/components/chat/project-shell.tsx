'use client';

import { usePathname } from 'next/navigation';
import { useAppTranslations } from '@goalspace/i18n';

import { CaptureBar } from '@/components/capture/capture-bar';
import type { CaptureTarget } from '@/lib/capture/targets';
import { PartnerChat, type SeedMessage } from './partner-chat';

/**
 * The project's arrangement, decided by route.
 *
 * On the resume view the Partner sits in a column down the right and the
 * record fills the rest. Everywhere else the layout is unchanged: content, with
 * the capture bar along the bottom.
 *
 * The composer moved sideways rather than being split in two. It keeps both
 * sends — ⌘↵ asks, ⌘⇧↵ records — because a second composer at the bottom of
 * the same screen would put two ways to record on one page, one of which
 * silently changes behaviour when the monthly cap is reached.
 *
 * Decided from the pathname because a layout does not know its active child
 * route, and `children` is a server-rendered subtree passed straight through.
 */
export function ProjectShell({
  slug,
  targets,
  initialMessages,
  hasPartner,
  addressable,
  children,
}: {
  slug: string;
  targets: CaptureTarget[];
  initialMessages: SeedMessage[];
  hasPartner: boolean;
  /** The project's other agents, addressable with a leading @handle. */
  addressable: string[];
  children: React.ReactNode;
}) {
  const { t } = useAppTranslations();
  const pathname = usePathname();
  const root = `/projects/${slug}`;
  const onResume = pathname === root || pathname === `${root}/`;

  // The subtraction is the header rail: h-14 (3.5rem) plus its 1px bottom border.
  const fullHeight = 'min-h-[calc(100svh-3.5rem-1px)]';

  if (!onResume || !hasPartner) {
    return (
      <div className={`flex ${fullHeight} flex-col`}>
        <div className="flex-1">{children}</div>
        <section aria-label={t('app.capture.region')}>
          <CaptureBar slug={slug} targets={targets} />
        </section>
      </div>
    );
  }

  return (
    <div className={`flex ${fullHeight} flex-col lg:flex-row`}>
      {/* min-w-0 so a long unbroken line in the record cannot push the rail
          off the screen. */}
      <div className="min-w-0 flex-1">{children}</div>

      <aside
        aria-label={t('app.chat.region')}
        className="border-rule flex max-h-[60svh] w-full shrink-0 flex-col border-t lg:sticky lg:top-14 lg:h-[calc(100svh-3.5rem-1px)] lg:max-h-none lg:w-[26rem] lg:border-l lg:border-t-0"
      >
        <PartnerChat
          slug={slug}
          targets={targets}
          initialMessages={initialMessages}
          addressable={addressable}
        />
      </aside>
    </div>
  );
}
