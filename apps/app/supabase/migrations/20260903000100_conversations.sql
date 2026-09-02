-- Conversations and their messages.
--
-- Designed in the phase 2 spec (§8) and built now that a surface needs them.
-- Not redesigned here: the shapes below are that section's, with the composite
-- foreign keys the proposals table established afterwards.
--
-- These are the better-shaped descendant of the old `chat_messages` table,
-- which hung off `spaces` and recorded neither run nor cost.

create table conversations (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id   uuid not null references users(id) on delete cascade,
  agent_id   uuid not null,
  title      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite, as on proposals: pointing at agents(id) alone would let the
  -- owner of two projects open a conversation in one attributed to an agent in
  -- the other, and RLS would permit it because both rows are theirs.
  foreign key (agent_id, project_id) references agents(id, project_id) on delete cascade,

  -- One rolling conversation per (project, agent) in v1. The schema carries no
  -- opinion about that beyond this constraint, which is what makes
  -- getOrCreateConversation a single statement rather than a read-then-write
  -- race. Drop it when a conversation picker ships.
  unique (project_id, agent_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  project_id      uuid not null references projects(id) on delete cascade,
  owner_id        uuid not null references users(id) on delete cascade,

  -- Only the two roles the owner can see. A conversation row is the record of
  -- what passed between a person and an agent, not the model's context window:
  -- system prompts and tool traffic belong to agent_tool_calls and the run
  -- trace, where they are already recorded with their arguments.
  role            text not null check (role in ('user','assistant')),
  content         text not null,

  -- Which run produced an assistant turn. Null on user turns, and null on an
  -- assistant turn whose run row was deleted.
  run_id          uuid,
  created_at      timestamptz not null default now(),

  foreign key (run_id, project_id) references agent_runs(id, project_id) on delete set null
);

-- The transcript: one conversation, oldest first.
create index messages_conversation_idx on messages (conversation_id, created_at);
-- record_entry validates a citation against this conversation's user turns.
create index messages_role_idx on messages (conversation_id, role);
-- Every policy filters on owner_id; without these, RLS degrades to a scan.
create index conversations_owner_idx on conversations (owner_id);
create index messages_owner_idx on messages (owner_id);

-- agent_runs gains its link back. Added by alter table because agent_runs
-- predates conversations, which is the creation order the spec names.
alter table agent_runs
  add column conversation_id uuid references conversations(id) on delete set null;
create index agent_runs_conversation_idx on agent_runs (conversation_id, started_at);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Owner-only, no public branch: the same regime as the rest of the agent
-- layer. A published project publishes entries and documents; it must not
-- publish what its owner said to an agent in private.
--
-- Insert and update additionally require the row's project to belong to the
-- caller, so ownership cannot be forged by relocating a row into someone
-- else's project. Longhand on purpose — a policy that exists only as a format
-- string cannot be grepped for.
create policy conversations_select on conversations for select
  using (owner_id = auth.uid());
create policy conversations_insert on conversations for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = conversations.project_id and p.owner_id = auth.uid()));
create policy conversations_update on conversations for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = conversations.project_id and p.owner_id = auth.uid()));
create policy conversations_delete on conversations for delete
  using (owner_id = auth.uid());

create policy messages_select on messages for select
  using (owner_id = auth.uid());
create policy messages_insert on messages for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid())
    and exists (select 1 from conversations c where c.id = messages.conversation_id and c.owner_id = auth.uid()));
create policy messages_update on messages for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = messages.project_id and p.owner_id = auth.uid()));
create policy messages_delete on messages for delete
  using (owner_id = auth.uid());

create or replace function public.touch_conversations_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_conversations_updated_at
  before update on conversations
  for each row execute function public.touch_conversations_updated_at();
