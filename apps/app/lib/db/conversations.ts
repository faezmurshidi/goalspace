import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type Conversation = Tables<'conversations'>;
export type Message = Omit<Tables<'messages'>, 'role'> & { role: 'user' | 'assistant' };

const MESSAGE_COLUMNS =
  'id, conversation_id, project_id, owner_id, role, content, run_id, created_at';

/**
 * The project's one conversation with this agent, creating it if absent.
 *
 * Upsert rather than read-then-insert: `unique (project_id, agent_id)` makes
 * the race decidable in the database, and two tabs opening the resume view
 * together would otherwise create two conversations and show different
 * transcripts.
 */
export async function getOrCreateConversation(
  supabase: Client,
  params: { projectId: string; ownerId: string; agentId: string }
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { project_id: params.projectId, owner_id: params.ownerId, agent_id: params.agentId },
      { onConflict: 'project_id,agent_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** The transcript, oldest first — reading order, not the log's newest-first. */
export async function listMessages(supabase: Client, conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function appendMessage(
  supabase: Client,
  params: {
    conversationId: string;
    projectId: string;
    ownerId: string;
    role: 'user' | 'assistant';
    content: string;
    runId?: string | null;
  }
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      project_id: params.projectId,
      owner_id: params.ownerId,
      role: params.role,
      content: params.content,
      run_id: params.runId ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Message;
}

/**
 * The ids record_entry may cite.
 *
 * A set rather than a list: the only question asked of it is membership, and
 * the caller checks it once per cited id. Restricted to user turns here rather
 * than at the call site, so a caller cannot forget the half of the rule that
 * matters — an assistant turn is the agent's own words, and recording those as
 * the owner's is exactly what the design forbids.
 */
export async function listUserMessageIds(
  supabase: Client,
  conversationId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('role', 'user');

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id));
}
