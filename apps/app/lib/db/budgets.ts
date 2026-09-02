import type { SupabaseClient } from '@supabase/supabase-js';

import type { Budget } from '@/lib/agents/caps';
import { worstCaseUsd } from '@/lib/agents/cost';
import type { UpdateBudgetValues } from '@/lib/schemas/budget';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

// `Budget` is imported, not redeclared. `lib/agents/caps.ts` already exports
// it and `checkCaps` takes it; a second shape here would be exactly the drift
// R2 moves these helpers out of the route to prevent.

/**
 * A project's budget, creating it with the column defaults on first read.
 *
 * This function was a private copy inside the agent ask route. It lives here so
 * the settings page and the executor read the same definition of a cap — two
 * copies would be two definitions, and the one that drifts would be the one
 * nobody is looking at.
 */
export async function getBudget(
  supabase: Client,
  projectId: string,
  ownerId: string
): Promise<Budget> {
  const { data, error } = await supabase
    .from('project_budgets')
    .select('monthly_cap_usd, per_run_token_cap')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    // numeric comes back from PostgREST as a string.
    return {
      monthly_cap_usd: Number(data.monthly_cap_usd),
      per_run_token_cap: data.per_run_token_cap,
    };
  }

  // Insert, then read back what the columns actually defaulted to, rather than
  // returning JavaScript constants that mirror them. Mirrored defaults are a
  // second definition: change the column default and this function keeps
  // reporting the old one, with a test that passes because it asserts the
  // constant.
  //
  // `select()` on the insert returns the stored row, including a row another
  // concurrent first read inserted first, so the race resolves to the same
  // values either way.
  const { data: created, error: insertError } = await supabase
    .from('project_budgets')
    .insert({ project_id: projectId, owner_id: ownerId })
    .select('monthly_cap_usd, per_run_token_cap')
    .maybeSingle();

  if (insertError && insertError.code !== '23505') throw insertError;

  if (created) {
    return {
      monthly_cap_usd: Number(created.monthly_cap_usd),
      per_run_token_cap: created.per_run_token_cap,
    };
  }

  // Lost the insert race: the row exists now, so read it.
  const { data: existing, error: rereadError } = await supabase
    .from('project_budgets')
    .select('monthly_cap_usd, per_run_token_cap')
    .eq('project_id', projectId)
    .single();

  if (rereadError) throw rereadError;
  return {
    monthly_cap_usd: Number(existing.monthly_cap_usd),
    per_run_token_cap: existing.per_run_token_cap,
  };
}

export async function updateBudget(
  supabase: Client,
  { projectId, ownerId, values }: { projectId: string; ownerId: string; values: UpdateBudgetValues }
): Promise<Budget | null> {
  const { data, error } = await supabase
    .from('project_budgets')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('owner_id', ownerId)
    .select('monthly_cap_usd, per_run_token_cap')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    monthly_cap_usd: Number(data.monthly_cap_usd),
    per_run_token_cap: data.per_run_token_cap,
  };
}

/**
 * What this project's agents have cost since the start of the UTC month.
 *
 * Delegates to `project_month_to_date_usd`, which sums in Postgres. Doing it
 * here — selecting the month's rows and adding them in JavaScript — would be
 * silently wrong: PostgREST caps a response at `max_rows` (1000) and truncates
 * without an error, and the ask route writes one usage row per step, so a
 * project crosses that at roughly 84 runs a month and the figure starts
 * drifting below the one the cap enforces.
 */
export async function monthToDateSpend(supabase: Client, projectId: string): Promise<number> {
  const { data, error } = await supabase.rpc('project_month_to_date_usd', {
    p_project_id: projectId,
  });

  if (error) throw error;
  // numeric arrives as a string.
  return Number(data ?? 0);
}

/**
 * The largest reservation a single run could take, across a project's models.
 *
 * The maximum, not the average and not the sum. §6.4 asks for the figure that
 * decides whether a run is refused, and the cap check evaluates one run at a
 * time: the average understates the threshold, and the sum describes every
 * agent running at once at full token cap, which nothing ever checks.
 */
export function worstCaseReservationUsd(
  models: string[],
  perRunTokenCap: number
): { usd: number; unpriced: string[] } {
  // Unpriced models are reported, not folded into the number. `worstCaseUsd`
  // returns 0 for a model absent from RATES, and $0.0000 on this page is
  // indistinguishable from a cheap model at a low cap — so the one surface
  // whose job is to state the refusal threshold would hide the case where
  // there effectively is none. The caller renders the names.
  const unpriced = models.filter((model) => worstCaseUsd(model, perRunTokenCap) === 0);
  const priced = models.filter((model) => worstCaseUsd(model, perRunTokenCap) > 0);

  return {
    usd: priced.length === 0 ? 0 : Math.max(...priced.map((m) => worstCaseUsd(m, perRunTokenCap))),
    unpriced,
  };
}
