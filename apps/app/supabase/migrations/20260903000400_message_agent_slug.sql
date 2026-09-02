-- Who spoke, on the message itself.
--
-- A turn can now come from any of the project's agents: `@critic is this
-- decision sound?` runs the Critic directly rather than going through the
-- Partner, and the transcript has to say so. Labelling every assistant turn
-- "Partner" would put the Critic's argument in the Partner's mouth.
--
-- Denormalised on purpose, against the usual preference. It could be derived
-- through run_id -> agent_runs -> agents, but run_id is nullable: the foreign
-- key is `on delete set null`, so deleting a run would erase the attribution of
-- a turn that is still in the transcript. It is also a historical record — an
-- agent later renamed or deleted should not change who a past turn came from.
alter table messages
  add column agent_slug text;
