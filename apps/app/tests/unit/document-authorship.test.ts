import { describe, expect, it } from 'vitest';

import { authorshipOf } from '@/lib/documents/authorship';

const AGENT = '11111111-1111-4111-8111-111111111111';

describe('authorshipOf', () => {
  it('names the agent when one is recorded', () => {
    expect(authorshipOf({ agent_id: AGENT })).toEqual({ by: 'agent', agentId: AGENT });
  });

  it('reads a null agent as the owner', () => {
    // Null means human-authored, the same convention entries, work items and
    // documents all use for their own agent_id.
    expect(authorshipOf({ agent_id: null })).toEqual({ by: 'owner' });
  });

  it('does not treat an empty string as an agent', () => {
    // A blank id is not provenance. Rendering it as "by an agent" would name
    // an author that does not exist, and the id would render as an empty span.
    expect(authorshipOf({ agent_id: '' })).toEqual({ by: 'owner' });
  });
});
