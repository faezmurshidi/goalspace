alter table projects           enable row level security;
alter table entries            enable row level security;
alter table work_items         enable row level security;
alter table documents          enable row level security;
alter table document_revisions enable row level security;
alter table attachments        enable row level security;

-- projects: owner reads and writes; public projects are world-readable.
create policy projects_select on projects for select
  using (owner_id = auth.uid() or visibility = 'public');
create policy projects_insert on projects for insert
  with check (owner_id = auth.uid());
create policy projects_update on projects for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy projects_delete on projects for delete
  using (owner_id = auth.uid());

-- Child tables: flat ownership for writes, one shallow EXISTS for public reads.
-- The insert check also requires the parent project to belong to the caller,
-- so ownership cannot be forged by pointing at someone else's project.
--
-- These 20 policies are written out rather than generated in a loop. Security
-- rules must be greppable: you cannot search for a policy that exists only as
-- a format string, and an auditor reading this file should see exactly what is
-- enforced without mentally expanding a DO block.

create policy entries_select on entries for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = entries.project_id and p.visibility = 'public'));
create policy entries_insert on entries for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy entries_update on entries for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy entries_delete on entries for delete
  using (owner_id = auth.uid());

create policy work_items_select on work_items for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = work_items.project_id and p.visibility = 'public'));
create policy work_items_insert on work_items for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy work_items_update on work_items for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy work_items_delete on work_items for delete
  using (owner_id = auth.uid());

create policy documents_select on documents for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = documents.project_id and p.visibility = 'public'));
create policy documents_insert on documents for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy documents_update on documents for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy documents_delete on documents for delete
  using (owner_id = auth.uid());

create policy document_revisions_select on document_revisions for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = document_revisions.project_id and p.visibility = 'public'));
create policy document_revisions_insert on document_revisions for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy document_revisions_update on document_revisions for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy document_revisions_delete on document_revisions for delete
  using (owner_id = auth.uid());

create policy attachments_select on attachments for select
  using (owner_id = auth.uid()
    or exists (select 1 from projects p where p.id = attachments.project_id and p.visibility = 'public'));
create policy attachments_insert on attachments for insert
  with check (owner_id = auth.uid()
    and exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy attachments_update on attachments for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy attachments_delete on attachments for delete
  using (owner_id = auth.uid());
