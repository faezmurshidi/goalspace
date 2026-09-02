-- Intake runs are neither a conversation nor an action on a work item.
--
-- The project intake (spec 2026-09-02, §9.1) opens two runs at project
-- creation: an Interviewer that asks and a Planner that proposes. Filing them
-- as 'conversation' was the alternative to this migration and is rejected —
-- once the Planner is reachable from a general ask surface the agent id no
-- longer tells an intake run from an owner-initiated one, and the cost of an
-- intake becomes unrecoverable from the trace.
--
-- Dropped and recreated rather than widened in place: Postgres has no ALTER
-- CONSTRAINT for a CHECK. The name is the one Postgres generated for the
-- inline check in 20260818000100_phase2a_agents.sql.
alter table agent_runs drop constraint agent_runs_trigger_check;

alter table agent_runs add constraint agent_runs_trigger_check
  check (trigger in ('conversation', 'work_item_action', 'intake'));
