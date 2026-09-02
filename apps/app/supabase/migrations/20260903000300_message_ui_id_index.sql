-- Make the ui_message_id index inferable by ON CONFLICT.
--
-- The index was created `where ui_message_id is not null`, which reads as the
-- careful choice and is the wrong one: Postgres cannot infer a partial index
-- from an ON CONFLICT target, so `upsert(..., { onConflict:
-- 'conversation_id,ui_message_id' })` raised, and the raise happened inside the
-- stream's onFinish callback where the rejection was swallowed. The assistant
-- turn was simply never stored, silently.
--
-- A plain unique index is correct anyway. Postgres treats NULLs as distinct, so
-- rows written outside the stream — the user's own turn, appended before the
-- run starts, with no SDK id yet — do not collide with each other.
drop index if exists messages_ui_id_idx;

create unique index messages_ui_id_idx
  on messages (conversation_id, ui_message_id);
