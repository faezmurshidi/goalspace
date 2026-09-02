import { describe, expect, it } from 'vitest';

import { sendModeFor } from '@/lib/chat/send-mode';

const key = (
  over: Partial<{ key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }>
) => ({ key: 'Enter', metaKey: false, ctrlKey: false, shiftKey: false, ...over }) as KeyboardEvent;

describe('sendModeFor', () => {
  it('sends to the Partner on the plain modifier', () => {
    expect(sendModeFor(key({ metaKey: true }), false)).toBe('chat');
    expect(sendModeFor(key({ ctrlKey: true }), false)).toBe('chat');
  });

  it('records on the shifted modifier', () => {
    expect(sendModeFor(key({ metaKey: true, shiftKey: true }), false)).toBe('record');
  });

  it('does nothing on a bare Enter', () => {
    // A newline in a composer must stay a newline. The capture bar has always
    // required the modifier and the muscle memory is worth keeping.
    expect(sendModeFor(key({}), false)).toBeNull();
  });

  it('records even on the chat modifier when the model layer is unavailable', () => {
    // The fallback that keeps criterion 5 true. Out of budget, or a gateway
    // error, degrades the composer to a notebook rather than a dead input — so
    // the chat modifier must still write rather than silently do nothing.
    expect(sendModeFor(key({ metaKey: true }), true)).toBe('record');
    expect(sendModeFor(key({ metaKey: true, shiftKey: true }), true)).toBe('record');
  });
});
