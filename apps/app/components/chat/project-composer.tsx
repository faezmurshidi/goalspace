'use client';

import { usePathname } from 'next/navigation';

import { CaptureBar } from '@/components/capture/capture-bar';
import type { CaptureTarget } from '@/lib/capture/targets';
import { PartnerChat, type SeedMessage } from './partner-chat';

/**
 * One composer, switching on the route.
 *
 * The chat is chat-capable only where the transcript is. A composer on the log
 * page would send messages into a conversation the owner cannot see, which is
 * why "replace the capture bar" could not mean everywhere.
 *
 * Decided from the pathname rather than a prop because the layout renders this,
 * and a layout does not know its active child route. The resume view is the
 * project root, so the test is an exact match on the project path.
 */
export function ProjectComposer({
  slug,
  targets,
  initialMessages,
  hasPartner,
}: {
  slug: string;
  targets: CaptureTarget[];
  initialMessages: SeedMessage[];
  hasPartner: boolean;
}) {
  const pathname = usePathname();
  const root = `/projects/${slug}`;
  const onResume = pathname === root || pathname === `${root}/`;

  if (!onResume || !hasPartner) {
    return <CaptureBar slug={slug} targets={targets} />;
  }
  return <PartnerChat slug={slug} targets={targets} initialMessages={initialMessages} />;
}
