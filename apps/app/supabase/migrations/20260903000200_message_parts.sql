-- Store the message, not a rendering of it.
--
-- `messages` recorded `role` and `content` only, so the transcript was seeded
-- back into the client as one text part per turn. Everything else a turn
-- carries — tool calls, their results, and the approval state of a call that is
-- waiting on the owner — was destroyed on every reload.
--
-- That was survivable while tools only read. It stopped being survivable when
-- record_entry started asking before it writes: an approval that the owner has
-- not answered lives in the assistant turn, so a reload silently discarded the
-- question and the entry behind it. Verified by logging what reached the chat
-- route — every incoming part arrived as `text`, on every request.
--
-- `content` stays. It is the flattened text of the turn, which is what
-- listUserMessageIds and any future search over the conversation want, and
-- keeping it means nothing that reads a message as prose has to learn the part
-- format.
alter table messages
  add column parts jsonb not null default '[]'::jsonb;

-- The id the AI SDK gave this message, so a streamed response that extends an
-- existing assistant turn updates that row instead of inserting a second copy
-- of it. Not the primary key: SDK ids are opaque strings, and messages.id is a
-- uuid that other tables may yet reference.
--
-- Nullable because a turn written outside the stream — the user's own message,
-- appended before the run starts — has no SDK id at the time it is stored.
alter table messages
  add column ui_message_id text;

create unique index messages_ui_id_idx
  on messages (conversation_id, ui_message_id)
  where ui_message_id is not null;
