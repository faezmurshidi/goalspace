-- Grant read_entry to agents seeded before the tool existed.
--
-- REPO_READ defines what a *newly seeded* agent gets. A live agent's allowlist
-- is a stored array, so every agent created before this migration keeps the
-- five tools it was seeded with, while every agent created after gets six.
--
-- That asymmetry is usually the correct one — agents are editable, and the
-- product should not silently rewrite what an owner has configured. It is
-- overridden here because the gap is not cosmetic: without read_entry an agent
-- handed an id by a citation, a proposal, or a search result has no operation
-- that accepts one, and guesses. That is exactly how the Planner burned a full
-- run looking for a tool that did not exist.
--
-- Scoped to agents that already hold read_document, which is the marker of an
-- agent seeded from REPO_READ rather than one an owner has deliberately
-- narrowed. An owner who stripped an agent back to search_repo alone keeps
-- their choice, and the Interviewer — whose empty allowlist is the whole point
-- of it — is untouched, because an empty array does not contain read_document.
--
-- read_entry is a pure read: `writes: false` and `external: false` in the
-- registry, and REPO_READ and WRITE_TOOLS are disjoint by construction. This
-- widens no agent's ability to change anything or to reach outside the system.
update public.agents
set tools = array_append(tools, 'read_entry')
where 'read_document' = any (tools)
  and not ('read_entry' = any (tools));
