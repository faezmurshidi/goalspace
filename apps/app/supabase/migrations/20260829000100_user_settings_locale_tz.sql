-- apps/app/supabase/migrations/20260829000100_user_settings_locale_tz.sql
--
-- Account preferences that currently live nowhere.
--
-- `locale` is resolved from a cookie today (packages/i18n reads NEXT_LOCALE),
-- which means a language choice does not follow a person to a new browser.
-- `time_zone` does not exist at all, so every date in the product renders in
-- whatever zone the server happens to run in — issue #14.
--
-- Both columns are INERT until slice D2 wires the account settings page to
-- them. They land here because a production migration is the riskiest step in
-- a slice and this repo lands schema ahead of the code that reads it, rather
-- than shipping two migrations for one feature.

alter table user_settings
  add column locale    text not null default 'en'
    check (locale in ('en', 'ms', 'zh')),
  add column time_zone text not null default 'UTC';

comment on column user_settings.locale is
  'Preferred UI language. Cookie remains the request-time source; this is the durable preference. Read from slice D2 onward.';

comment on column user_settings.time_zone is
  'IANA zone name, e.g. "Asia/Kuala_Lumpur". Dates render in this zone from slice D2 onward. Not constrained by CHECK: the IANA list changes, and a stale constraint would reject a legitimate new zone.';

/**
 * Month-to-date agent spend for one project.
 *
 * In SQL, not in the application, for a reason that is easy to miss: PostgREST
 * caps a response at `max_rows` (1000 in supabase/config.toml) and truncates
 * silently. The ask route writes one ai_usage row per step with a 12-step
 * ceiling, so a project passes 1000 rows at roughly 84 runs in a month, and a
 * client-side sum would quietly start under-reporting — worst precisely when
 * spend is high enough to matter.
 *
 * The window is the one start_agent_run enforces against, character for
 * character (see 20260821090000_phase2a_hardening.sql). Two copies of that
 * expression is already one more than ideal; a third, in another language, in
 * a page whose whole job is to agree with the cap, would be indefensible.
 *
 * SECURITY INVOKER so RLS applies: a caller sums only projects they can read.
 */
create or replace function project_month_to_date_usd(p_project_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(u.cost_usd), 0)
    from public.ai_usage u
   where u.project_id = p_project_id
     and u.created_at >= (date_trunc('month', (now() at time zone 'utc')) at time zone 'utc');
$$;

comment on function project_month_to_date_usd(uuid) is
  'Month-to-date agent spend for one project, summed in SQL rather than the client because PostgREST truncates a response at max_rows (1000) with no error. Window matches start_agent_run character for character.';
