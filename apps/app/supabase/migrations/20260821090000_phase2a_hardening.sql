--
-- Phase 2a hardening: three defects found after the layer shipped.
--

-- 1. search_repo carried no pinned search_path (linter 0011).
--
-- The function is SECURITY INVOKER, so this is hardening rather than an
-- incident — it already runs as the caller and RLS already applies. But an
-- unqualified name resolved against a caller-controlled schema is exactly the
-- shape of bug that becomes serious the moment someone marks it DEFINER for
-- performance. Pinning the path to empty forces every reference to be
-- explicit; the regconfig is qualified for the same reason, since 'english'
-- is itself resolved through search_path.
create or replace function search_repo(p_project_id uuid, p_query text, p_limit int default 20)
returns table (source_type text, source_id uuid, title text, snippet text, rank real)
language sql
stable
set search_path = ''
as $$
  -- The union is wrapped so ORDER BY has a named column to sort on. A bare
  -- `order by rank` across UNION ALL branches fails: the branches never alias
  -- their output, so there is no `rank` in scope to reference.
  select r.source_type, r.source_id, r.title, r.snippet, r.rank
    from (
      with q as (select pg_catalog.websearch_to_tsquery('pg_catalog.english', p_query) as tsq)
      select 'entry'::text as source_type, e.id as source_id, e.title as title,
             pg_catalog.ts_headline('pg_catalog.english', e.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10') as snippet,
             pg_catalog.ts_rank(e.search_tsv, q.tsq) as rank
        from public.entries e, q
       where e.project_id = p_project_id and e.search_tsv @@ q.tsq
      union all
      select 'work_item'::text, w.id, w.title,
             pg_catalog.ts_headline('pg_catalog.english', w.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
             pg_catalog.ts_rank(w.search_tsv, q.tsq)
        from public.work_items w, q
       where w.project_id = p_project_id and w.search_tsv @@ q.tsq
      union all
      select 'document'::text, d.id, d.title,
             pg_catalog.ts_headline('pg_catalog.english', d.body, q.tsq, 'MaxFragments=1,MaxWords=40,MinWords=10'),
             pg_catalog.ts_rank(d.search_tsv, q.tsq)
        from public.documents d, q
       where d.project_id = p_project_id and d.search_tsv @@ q.tsq
    ) r
   order by r.rank desc
   limit p_limit;
$$;

comment on function search_repo(uuid, text, int) is
  'Full-text search across a project''s entries, work items, and documents. SECURITY INVOKER so RLS applies; search_path pinned per linter 0011.';

-- 2. The default model was a model this account cannot call.
--
-- anthropic/claude-sonnet-5 is the design's choice and remains the intent, but
-- every anthropic/* slug returns 403 RestrictedModelsError without gateway
-- credits. A default is what an agent gets when nobody chose — it should be
-- something that works. Move it back when the account is funded.
alter table agents alter column model set default 'openai/gpt-4o-mini';

-- 3. The monthly cap could be raced by concurrent runs.
--
-- The check was read-then-insert: two runs starting together both read the
-- same month-to-date spend, both saw headroom, and both proceeded. Spend is
-- only known after a run, so no amount of reading fixes this — the fix is to
-- reserve budget up front and to make the reserve-and-insert one atomic step.
--
-- reserved_usd is the worst case that run can cost, computed by the caller
-- from per_run_token_cap and the model's rate. It is counted against the cap
-- while the run is in flight and stops counting the moment it lands, because
-- by then the real cost is in ai_usage.
alter table agent_runs add column reserved_usd numeric(12,6) not null default 0;

/**
 * Atomically decide whether a run may start, and start it.
 *
 * SECURITY INVOKER (the default) is load-bearing exactly as it is in
 * search_repo: the insert must pass agent_runs_insert, and the reads must see
 * only the caller's own budget and usage.
 *
 * The advisory lock is transaction-scoped and keyed by project, so two runs on
 * the same project serialise here while runs on different projects do not
 * contend at all. A function call is its own transaction when invoked as a
 * single statement, so the lock is released as soon as the decision is made.
 */
create function start_agent_run(
  p_project_id   uuid,
  p_agent_id     uuid,
  p_work_item_id uuid,
  p_trigger      text,
  p_reserved_usd numeric
)
returns table (run_id uuid, allowed boolean, month_to_date numeric, monthly_cap numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner    uuid := auth.uid();
  v_cap      numeric;
  v_spent    numeric;
  v_reserved numeric;
  v_run_id   uuid;
begin
  -- Serialise the check and the insert for this project. hashtextextended
  -- gives the bigint key the advisory lock functions require.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_project_id::text, 0));

  select b.monthly_cap_usd into v_cap
    from public.project_budgets b
   where b.project_id = p_project_id;

  if v_cap is null then
    insert into public.project_budgets (project_id, owner_id)
    values (p_project_id, v_owner)
    on conflict (project_id) do nothing;

    select b.monthly_cap_usd into v_cap
      from public.project_budgets b
     where b.project_id = p_project_id;
  end if;

  select coalesce(sum(u.cost_usd), 0) into v_spent
    from public.ai_usage u
   where u.project_id = p_project_id
     -- Back to timestamptz explicitly: date_trunc over a naive timestamp
     -- returns one, and comparing it to created_at would otherwise lean on an
     -- implicit cast through the server's timezone rather than UTC.
     and u.created_at >= (date_trunc('month', (now() at time zone 'utc')) at time zone 'utc');

  -- Only runs that are plausibly still alive hold a reservation. maxDuration
  -- on the route is 300s; a run still marked 'running' well past that lost its
  -- process before onEnd could fire, and must not reserve budget forever.
  select coalesce(sum(r.reserved_usd), 0) into v_reserved
    from public.agent_runs r
   where r.project_id = p_project_id
     and r.status = 'running'
     and r.started_at > now() - interval '15 minutes';

  if v_spent + v_reserved + p_reserved_usd > v_cap then
    return query select null::uuid, false, v_spent, v_cap;
    return;
  end if;

  insert into public.agent_runs
    (project_id, owner_id, agent_id, work_item_id, trigger, status, reserved_usd)
  values
    (p_project_id, v_owner, p_agent_id, p_work_item_id, p_trigger, 'running', p_reserved_usd)
  returning id into v_run_id;

  return query select v_run_id, true, v_spent, v_cap;
end;
$$;

comment on function start_agent_run(uuid, uuid, uuid, text, numeric) is
  'Reserves budget and opens an agent_runs row under a per-project advisory lock, so concurrent runs cannot both pass the monthly cap check.';
