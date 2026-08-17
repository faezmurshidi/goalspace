-- Provision public.users from auth.users via a database trigger.
--
-- Every phase-1 table keys owner_id off users(id), so a signed-in user with no
-- profile row cannot write anything: the first insert fails on the foreign key.
-- The monorepo split dropped the client-side insert that used to create this
-- row (it only ever ran when email verification was disabled, so it was always
-- fragile), leaving sign-up unable to provision a profile at all.
--
-- A trigger replaces it because it is the only place that cannot be bypassed:
-- it fires for password sign-up, OAuth, magic link, and admin-created users
-- alike, and it runs inside the same transaction as the auth insert, so a
-- session never exists without its profile.

-- security definer so the insert bypasses the RLS policies on public.users:
-- the trigger runs before the new user has a session, so auth.uid() is null
-- and users_insert (id = auth.uid()) would reject the row.
--
-- search_path is pinned to empty and every name below is schema-qualified.
-- A definer function that inherits the caller's search_path can be induced to
-- resolve `users` to an attacker-controlled table on a schema they can create.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    -- auth.users.email is nullable (phone and anonymous sign-ups), but
    -- public.users.email is `not null unique`. Raising here would abort the
    -- whole sign-up transaction, so an unusable but unique placeholder is
    -- the better failure: the account works, the address is visibly invalid.
    -- .invalid is reserved by RFC 2606 and can never resolve.
    coalesce(new.email, new.id::text || '@placeholder.invalid'),
    -- Providers disagree on the metadata key: Google and GitHub send
    -- full_name, Apple and some OIDC providers send name.
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  -- Guaranteeing the settings row here means every read path can treat it as
  -- present rather than handling absence. Every column has a default, and the
  -- users row above is inserted in the same transaction, so the foreign key
  -- is satisfied.
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the public.users profile and user_settings row for a new auth.users record.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the mirrored address current. public.users.email is `not null unique`,
-- so a stale copy after an email change is not merely cosmetic: it can collide
-- with a later sign-up that legitimately claims the new address.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set email = coalesce(new.email, id::text || '@placeholder.invalid')
  where id = new.id;

  return new;
end;
$$;

comment on function public.handle_user_email_change() is
  'Mirrors an auth.users email change onto the public.users profile row.';

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Backfill. Accounts created before this migration have no profile row, which
-- includes every account used to test the app so far. Without this they stay
-- permanently unable to create a project.
insert into public.users (id, email, full_name, avatar_url)
select
  au.id,
  coalesce(au.email, au.id::text || '@placeholder.invalid'),
  coalesce(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name'
  ),
  coalesce(
    au.raw_user_meta_data ->> 'avatar_url',
    au.raw_user_meta_data ->> 'picture'
  )
from auth.users au
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select u.id from public.users u
on conflict (user_id) do nothing;
