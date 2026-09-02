import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Tables } from '@/types/supabase';

type Client = SupabaseClient<Database>;

export type Conversation = Tables<'conversations'>;
export type Message = Omit<Tables<'messages'>, 'role'> & { role: 'user' | 'assistant' };

const MESSAGE_COLUMNS =
  'id, conversation_id, project_id, owner_id, role, content, parts, run_id, ui_message_id, agent_slug, created_at';

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

export interface MessageInput {
  conversationId: string;
  projectId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  content: string;
  /** The turn as it actually was, tool calls and approval state included. */
  parts?: unknown[];
  runId?: string | null;
  /** The AI SDK's id for this message, when it came from a stream. */
  uiMessageId?: string | null;
  /** Which agent spoke. Null on the owner's own turns. */
  agentSlug?: string | null;
}

export async function appendMessage(supabase: Client, params: MessageInput): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(rowFrom(params))
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Message;
}

function rowFrom(params: MessageInput) {
  return {
    conversation_id: params.conversationId,
    project_id: params.projectId,
    owner_id: params.ownerId,
    role: params.role,
    content: params.content,
    parts: (params.parts ?? []) as never,
    run_id: params.runId ?? null,
    ui_message_id: params.uiMessageId ?? null,
    agent_slug: params.agentSlug ?? null,
  };
}

/**
 * Store a streamed turn, replacing it if this stream extended one already
 * stored.
 *
 * A response can continue the assistant message that requested a tool
 * approval rather than starting a new one, so the same SDK id arrives twice
 * with more parts the second time. Inserting both would leave the transcript
 * holding the question and the answer as separate turns, and the older row
 * still showing an approval the owner has since decided.
 *
 * Keyed on (conversation_id, ui_message_id), which is the unique index the
 * migration adds.
 */
export async function upsertStreamedMessage(
  supabase: Client,
  params: MessageInput & { uiMessageId: string }
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .upsert(rowFrom(params), { onConflict: 'conversation_id,ui_message_id' })
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
