-- apps/app/supabase/migrations/20260827000100_revision_authorship.sql
--
-- Who wrote the body a revision preserves.
--
-- A revision records the body being *replaced*, so its author is whoever wrote
-- that body — `documents.agent_id` at the moment of replacement. That was
-- discarded, which left the history able to say when a body changed but never
-- who had written the one that went away.
--
-- Nullable, and null means human-authored, exactly as on documents, entries and
-- work_items. Existing rows stay null: we genuinely do not know, and inventing
-- an author would be worse than admitting it.
alter table document_revisions
  add column agent_id uuid references agents(id) on delete set null;

comment on column document_revisions.agent_id is
  'Author of the body this revision preserves. Null means human-authored.';

-- The function is replaced whole rather than patched, because a `create or
-- replace` of a plpgsql body is all-or-nothing and a partial edit is not a
-- thing Postgres offers. Only the revision insert changes: it now carries
-- v_current.agent_id, the author of the body being replaced.
create or replace function apply_document_edit(
  p_document_id         uuid,
  p_project_id          uuid,
  p_owner_id            uuid,
  p_agent_id            uuid,
  p_expected_updated_at timestamptz,
  p_title               text,
  p_body                text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.documents%rowtype;
begin
  -- The lock is the whole mechanism. A concurrent edit waits here rather than
  -- racing ahead to insert a revision it will not earn.
  select * into v_current
    from public.documents
   where id = p_document_id and project_id = p_project_id
     for update;

  if not found then return null; end if;

  if p_expected_updated_at is not null and v_current.updated_at <> p_expected_updated_at then
    return null;
  end if;

  insert into public.document_revisions
    (document_id, project_id, owner_id, title, body, agent_id)
  values
    (v_current.id, p_project_id, p_owner_id, v_current.title, v_current.body,
     v_current.agent_id);

  update public.documents
     set title      = coalesce(p_title, title),
         body       = coalesce(p_body, body),
         agent_id   = p_agent_id,
         updated_at = now()
   where id = p_document_id;

  return p_document_id;
end;
$$;
