'use client';

import type { ComponentProps } from 'react';
import { Button, cn } from '@goalspace/ui';
import { ArrowDownIcon } from 'lucide-react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';

/**
 * Adapted from AI SDK Elements (registry.ai-sdk.dev), which is a copy-in
 * registry rather than a package — these components are ours once taken.
 *
 * Only this one was taken. `Response` was not: it depends on `streamdown`, and
 * `components/docs/markdown.tsx` already renders markdown with safety
 * properties covered by tests/unit/markdown.test.ts. Two markdown renderers
 * with different escaping rules is a liability, not a convenience.
 *
 * What this is worth taking for is `use-stick-to-bottom`: a transcript must
 * follow a streaming reply and stop the instant the reader scrolls up to read
 * something earlier. Written by hand that is a scroll-position race; here it is
 * a dependency.
 *
 * Restyled to the paper/ink/rule system. The upstream look is the AI-startup
 * register PRODUCT.md names as its primary anti-reference.
 */
export function Conversation({ className, ...props }: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={cn('relative flex-1 overflow-y-auto', className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export function ConversationContent({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) {
  return <StickToBottom.Content className={cn('p-4', className)} {...props} />;
}

export function ConversationScrollButton({ className, ...props }: ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => scrollToBottom()}
      className={cn('absolute bottom-2 left-1/2 -translate-x-1/2', className)}
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}
