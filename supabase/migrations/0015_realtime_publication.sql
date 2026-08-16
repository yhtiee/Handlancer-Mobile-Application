-- Turn on realtime for the tables the app subscribes to.
--
-- 0004 left this as a manual "go and tick a box in the dashboard" note, which is
-- why nothing updates live: `subscribeToNotifications` opens a channel happily
-- and simply never receives an event, because the table was never in the
-- publication. Doing it here means a fresh environment is correct on first push.
--
-- Realtime honours RLS, so subscribers still only receive rows they are allowed
-- to select — no extra filtering is needed on top of the existing policies.

do $$
declare
  t text;
  wanted text[] := array[
    'notifications',  -- feed + unread badge
    'jobs',           -- status moves: hiring → in_progress → completed
    'quotes',         -- new/approved quotes on a job
    'escrows',        -- milestone requests and releases
    'messages',       -- chat threads
    'transactions',   -- wallet activity
    'wallets'         -- balance changes (top-ups land via webhook)
  ];
begin
  foreach t in array wanted loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- UPDATE and DELETE events carry only the primary key unless the table records
-- the full old row. The app reacts to status changes on these, so it needs them.
alter table jobs     replica identity full;
alter table quotes   replica identity full;
alter table escrows  replica identity full;
alter table wallets  replica identity full;
