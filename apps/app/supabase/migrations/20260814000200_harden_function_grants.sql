-- Function hardening, in response to the Supabase database linter.
--
-- Two distinct problems, both about functions in the `public` schema.

-- 1. `public` is exposed through PostgREST, so every function in it is
-- reachable as /rest/v1/rpc/<name> by whichever roles hold EXECUTE. Postgres
-- grants EXECUTE to PUBLIC on new functions by default, which handed `anon`
-- and `authenticated` a callable entry point into two SECURITY DEFINER
-- functions (linter 0028/0029).
--
-- Direct calls would in fact fail, because a plpgsql function returning
-- `trigger` raises when invoked outside a trigger context. That makes this
-- hardening rather than an incident, but "unreachable because the language
-- happens to reject it" is not an access control decision, and the next
-- definer function added here might not have that accidental protection.
--
-- EXECUTE is only checked when the trigger is CREATED, not each time it
-- fires, so revoking from the client roles cannot break sign-up. The trigger
-- itself runs during an insert performed by `supabase_auth_admin`, whose
-- grant is left intact along with `postgres` and `service_role`.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

-- 2. `update_updated_at_column` predates this migration and carries no pinned
-- search_path (linter 0011). Any definer-or-trigger function that inherits the
-- caller's search_path can be steered to resolve an unqualified name against a
-- schema the caller controls. This function touches only NEW, so pinning the
-- path to empty changes nothing about its behaviour.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.update_updated_at_column() is
  'Sets updated_at to now() on UPDATE. search_path pinned per linter 0011.';
