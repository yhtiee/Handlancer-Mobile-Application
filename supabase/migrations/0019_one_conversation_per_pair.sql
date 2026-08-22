-- One chat thread per pair of people, enforced by the database.
--
-- "Message provider" was opening a fresh thread when one already existed, so
-- the history disappeared. The client already looked for an existing thread
-- before inserting, but nothing stopped a second row existing: the only
-- constraint was `unique (job_id, user_id, provider_id)`, and
--   * NULLs are distinct in a unique constraint, so any number of rows with a
--     null job_id were allowed for the same two people;
--   * a different job_id was a different row by design, so a pair accumulated
--     one thread per job;
--   * the columns are positional, so (U,P) and (P,U) never collided;
--   * two taps racing each other both saw "none exists" and both inserted.
--
-- A check the client performs is a race, not a constraint. This merges what is
-- already duplicated and then makes a second thread unrepresentable.

-- ───────────────── Merge existing duplicates ─────────────────
-- The oldest row per pair wins: it is the one carrying the history. The CTE is
-- repeated rather than materialised in a temp table so each statement stands on
-- its own; (created_at, id) is a total order, so both runs pick the same winner.

-- 1. Move the messages onto the surviving thread.
with ranked as (
  select
    id,
    first_value(id) over (
      partition by least(user_id, provider_id), greatest(user_id, provider_id)
      order by created_at asc, id asc
    ) as keep_id
  from conversations
)
update messages m
   set conversation_id = r.keep_id
  from ranked r
 where m.conversation_id = r.id
   and r.id <> r.keep_id;

-- 2. Repoint notification deep links, or tapping an old 'message' notification
--    would open a conversation that is about to stop existing.
with ranked as (
  select
    id,
    first_value(id) over (
      partition by least(user_id, provider_id), greatest(user_id, provider_id)
      order by created_at asc, id asc
    ) as keep_id
  from conversations
)
update notifications n
   set payload = jsonb_set(n.payload, '{conversation_id}', to_jsonb(r.keep_id::text))
  from ranked r
 where n.payload->>'conversation_id' = r.id::text
   and r.id <> r.keep_id;

-- 3. Drop the losers. Their messages have already moved, so the cascade on
--    `messages.conversation_id` has nothing left to take with it.
with ranked as (
  select
    id,
    first_value(id) over (
      partition by least(user_id, provider_id), greatest(user_id, provider_id)
      order by created_at asc, id asc
    ) as keep_id
  from conversations
)
delete from conversations c
 using ranked r
 where c.id = r.id
   and r.id <> r.keep_id;

-- ───────────────── Make a second thread impossible ─────────────────
-- Normalised on (least, greatest) so the constraint holds whichever way round
-- the two ids were written.
alter table conversations
  drop constraint if exists conversations_job_id_user_id_provider_id_key;

create unique index if not exists conversations_pair_uniq
  on conversations (least(user_id, provider_id), greatest(user_id, provider_id));

-- job_id now records what a thread is *currently* about rather than being part
-- of its identity, so the chat header can follow the conversation.
comment on column conversations.job_id is
  'The job this thread is currently about. Not part of the thread identity - see conversations_pair_uniq.';
