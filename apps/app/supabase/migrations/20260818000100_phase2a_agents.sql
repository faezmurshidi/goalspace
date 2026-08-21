--
-- Phase 2a: agents as capability boundaries, plus the run and cost record.
--
-- No embeddings table and no pgvector. A single project is small — hundreds
-- of entries — so search_repo is Postgres full-text only. The tool interface
-- is shaped so a vector half can be unioned in later without changing callers.

create table agents (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  owner_id         uuid not null references users(id) on delete cascade,
  slug             text not null,
  name             text not null,
  role_description text not null default '',
  system_prompt    text not null,
  tools            text[] not null default '{}',
  model            text not null default 'anthropic/claude-sonnet-5',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, slug),
  unique (id, project_id)
);

-- The phase-1 amendment lands here: agent_id was created nullable and
-- unconstrained precisely so this foreign key could be added without a
-- rewrite. Null still means human-authored.
alter table entries    add constraint entries_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;
alter table work_items add constraint work_items_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;
alter table documents  add constraint documents_agent_fk
  foreign key (agent_id) references agents(id) on delete set null;

create table agent_runs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  agent_id     uuid not null references agents(id) on delete cascade,
  work_item_id uuid references work_items(id) on delete set null,
  trigger      text not null check (trigger in ('conversation','work_item_action')),
  status       text not null check (status in ('running','succeeded','failed','cancelled','capped')),
  step_count   integer not null default 0,
  error        text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table agent_tool_calls (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references agent_runs(id) on delete cascade,
  project_id     uuid not null references projects(id) on delete cascade,
  owner_id       uuid not null references users(id) on delete cascade,
  tool           text not null,
  args           jsonb not null,
  result_summary text,
  ok             boolean not null,
  duration_ms    integer,
  created_at     timestamptz not null default now()
);

create table ai_usage (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  owner_id            uuid not null references users(id) on delete cascade,
  agent_id            uuid references agents(id) on delete set null,
  run_id              uuid references agent_runs(id) on delete set null,
  work_item_id        uuid references work_items(id) on delete set null,
  model               text not null,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  cached_input_tokens integer not null default 0,
  cost_usd            numeric(12,6) not null default 0,
  created_at          timestamptz not null default now()
);

create table project_budgets (
  project_id        uuid primary key references projects(id) on delete cascade,
  owner_id          uuid not null references users(id) on delete cascade,
  -- Not nullable, unlike the spec's sketch. A nullable cap makes the default
  -- posture "unlimited", which contradicts the criterion that exceeding a cap
  -- must stop runs rather than silently overspend.
  monthly_cap_usd   numeric(10,2) not null default 10.00,
  per_run_token_cap integer not null default 200000,
  updated_at        timestamptz not null default now()
);

create index agent_runs_project_started_idx  on agent_runs (project_id, started_at desc);
create index agent_tool_calls_run_idx        on agent_tool_calls (run_id, created_at);
create index ai_usage_project_created_idx    on ai_usage (project_id, created_at desc);

-- Full-text search. Generated columns keep the vector in step with the row
-- without a trigger to forget.
alter table entries    add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;
alter table work_items add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;
alter table documents  add column search_tsv tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored;

create index entries_search_idx    on entries    using gin (search_tsv);
create index work_items_search_idx on work_items using gin (search_tsv);
create index documents_search_idx  on documents  using gin (search_tsv);

-- SECURITY INVOKER (the default) is load-bearing: the function must run as
-- the caller so RLS applies to every table it touches. A SECURITY DEFINER
-- here would let any caller read any project's rows through the union.
create function search_repo(p_project_id uuid, p_query text, p_limit int default 20)
returns table (source_type text, source_id uuid, title text, snippet text, rank real)
language sql
stable
as $$
  -- The union is wrapped so ORDER BY has a named column to sort on. A bare
  -- `order by rank` across UNION ALL branches fails: the branches never alias
  -- their output, so there is no `rank` in scope to reference.
  select r.source_type, r.source_id, r.title, r.snippet, r.rank
    from (
      with q as (select websearch_to_tsquery('english', p_query) as tsq)
      select 'entry'::text as source_type, e.id as source_id, e.title as title,
             ts_headline('english', e.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10') as snippet,
             ts_rank(e.search_tsv, q.tsq) as rank
        from entries e, q
       where e.project_id = p_project_id and e.search_tsv @@ q.tsq
      union all
      select 'work_item'::text, w.id, w.title,
             ts_headline('english', w.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
             ts_rank(w.search_tsv, q.tsq)
        from work_items w, q
       where w.project_id = p_project_id and w.search_tsv @@ q.tsq
      union all
      select 'document'::text, d.id, d.title,
             ts_headline('english', d.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
             ts_rank(d.search_tsv, q.tsq)
        from documents d, q
       where d.project_id = p_project_id and d.search_tsv @@ q.tsq
    ) r
   order by r.rank desc
   limit p_limit;
$$;

alter table agents           enable row level security;
alter table agent_runs       enable row level security;
alter table agent_tool_calls enable row level security;
alter table ai_usage         enable row level security;
alter table project_budgets  enable row level security;

-- Owner-only, with no public branch anywhere below.
--
-- Phase 1's child tables carry `or exists (... visibility = 'public')` so a
-- published project can be read. Extending that here would publish system
-- prompts, conversation content, run traces (including any query that left
-- the system), and spend figures the moment someone flips a project public.
-- Publishing the record is a phase-3 decision about entries and documents,
-- not about the machinery that produced them.
--
-- As in phase 1, insert and update checks additionally require the row's
-- project to belong to the caller, so ownership cannot be forged by
-- relocating a row into someone else's project. Written out longhand: you
-- cannot grep for a policy that exists only as a format string.

create policy agents_select on agents for select
  using (owner_id = auth.uid());
create policy agents_insert on agents for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agents.project_id and p.owner_id = auth.uid()));
create policy agents_update on agents for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agents.project_id and p.owner_id = auth.uid()));
create policy agents_delete on agents for delete
  using (owner_id = auth.uid());

create policy agent_runs_select on agent_runs for select
  using (owner_id = auth.uid());
create policy agent_runs_insert on agent_runs for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_runs.project_id and p.owner_id = auth.uid()));
create policy agent_runs_update on agent_runs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_runs.project_id and p.owner_id = auth.uid()));
create policy agent_runs_delete on agent_runs for delete
  using (owner_id = auth.uid());

create policy agent_tool_calls_select on agent_tool_calls for select
  using (owner_id = auth.uid());
create policy agent_tool_calls_insert on agent_tool_calls for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_tool_calls.project_id and p.owner_id = auth.uid()));
create policy agent_tool_calls_update on agent_tool_calls for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = agent_tool_calls.project_id and p.owner_id = auth.uid()));
create policy agent_tool_calls_delete on agent_tool_calls for delete
  using (owner_id = auth.uid());

create policy ai_usage_select on ai_usage for select
  using (owner_id = auth.uid());
create policy ai_usage_insert on ai_usage for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = ai_usage.project_id and p.owner_id = auth.uid()));
create policy ai_usage_update on ai_usage for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = ai_usage.project_id and p.owner_id = auth.uid()));
create policy ai_usage_delete on ai_usage for delete
  using (owner_id = auth.uid());

create policy project_budgets_select on project_budgets for select
  using (owner_id = auth.uid());
create policy project_budgets_insert on project_budgets for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_budgets.project_id and p.owner_id = auth.uid()));
create policy project_budgets_update on project_budgets for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_budgets.project_id and p.owner_id = auth.uid()));
create policy project_budgets_delete on project_budgets for delete
  using (owner_id = auth.uid());
