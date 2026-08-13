-- Phase 1 baseline. Nothing is in production, so this replaces the entire
-- migration history rather than migrating from it.

create extension if not exists "uuid-ossp";

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Retained auth tables. users.id IS auth.users.id, so the flat
-- owner_id = auth.uid() policies added in Task 5 are correct by construction.
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_settings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  theme               text not null default 'system',
  email_notifications boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id)
);

create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  slug        text not null,
  title       text not null,
  brief       text,
  kind        text not null check (kind in ('build','learn','research')),
  visibility  text not null default 'private' check (visibility in ('private','public')),
  status      text not null default 'active' check (status in ('active','paused','done','abandoned')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, slug)
);

create table entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  agent_id    uuid,
  kind        text not null check (kind in ('note','decision','source','session')),
  title       text,
  body        text not null default '',
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table work_items (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  owner_id           uuid not null references users(id) on delete cascade,
  agent_id           uuid,
  parent_id          uuid references work_items(id) on delete cascade,
  order_index        integer not null default 0,
  kind               text not null default 'task' check (kind in ('task','question')),
  status             text not null default 'open' check (status in ('open','doing','blocked','done','dropped')),
  title              text not null,
  body               text not null default '',
  wake_at            timestamptz,
  closed_by_entry_id uuid references entries(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  status_changed_at  timestamptz not null default now(),
  closed_at          timestamptz
);

-- entries.work_item_id is added after work_items exists (mutual reference).
alter table entries
  add column work_item_id uuid references work_items(id) on delete set null;

create table documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id   uuid not null references users(id) on delete cascade,
  agent_id   uuid,
  title      text not null,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_revisions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  owner_id    uuid not null references users(id) on delete cascade,
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create table attachments (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  owner_id     uuid not null references users(id) on delete cascade,
  entry_id     uuid references entries(id) on delete cascade,
  document_id  uuid references documents(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  byte_size    bigint not null,
  created_at   timestamptz not null default now(),
  check (num_nonnulls(entry_id, document_id) = 1)
);

create index entries_project_occurred_idx on entries (project_id, occurred_at desc);
create index entries_work_item_idx on entries (work_item_id);
create index work_items_tree_idx on work_items (project_id, parent_id, order_index);
create index work_items_status_idx on work_items (project_id, status);
create index documents_project_idx on documents (project_id);
create index document_revisions_doc_idx on document_revisions (document_id, created_at desc);
create index attachments_entry_idx on attachments (entry_id);
create index attachments_document_idx on attachments (document_id);
create index projects_owner_updated_idx on projects (owner_id, updated_at desc);

create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();
create trigger update_user_settings_updated_at before update on user_settings
  for each row execute function update_updated_at_column();
create trigger update_projects_updated_at before update on projects
  for each row execute function update_updated_at_column();
create trigger update_entries_updated_at before update on entries
  for each row execute function update_updated_at_column();
create trigger update_work_items_updated_at before update on work_items
  for each row execute function update_updated_at_column();
create trigger update_documents_updated_at before update on documents
  for each row execute function update_updated_at_column();

-- RLS for the two retained auth tables. The six phase-1 tables get theirs in
-- Task 5. The old schema enabled RLS on users with no INSERT policy at all,
-- so the auth callback's insert could never have succeeded; these fix that.
alter table users enable row level security;
alter table user_settings enable row level security;

create policy users_select on users for select using (id = auth.uid());
create policy users_insert on users for insert with check (id = auth.uid());
create policy users_update on users for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_settings_select on user_settings for select using (user_id = auth.uid());
create policy user_settings_insert on user_settings for insert with check (user_id = auth.uid());
create policy user_settings_update on user_settings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
