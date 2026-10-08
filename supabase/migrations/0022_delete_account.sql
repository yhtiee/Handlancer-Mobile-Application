-- Account deletion (Settings → Delete account).
--
-- Deleting a person must not delete the other side of their history. Before
-- this, `profiles.id` cascaded from `auth.users`, and almost every table
-- cascades from `profiles`: a client deleting their account would have wiped
-- the provider's completed jobs, escrow records, payout transactions and the
-- reviews on their profile. And `jobs.hired_provider_id` has no cascade at
-- all, so deleting any provider who was ever hired would have failed outright.
--
-- So deletion is: refuse while money or work is still in flight, close what
-- is merely open, scrub every personal field, mark the profile deleted, and
-- delete the login. The profile row stays — as "Deleted user" — so jobs,
-- escrows, transactions and reviews keep a valid counterparty.

alter table profiles add column if not exists deleted_at timestamptz;

-- The profile must survive its auth user. Drop the cascading FK, whatever it
-- was named.
do $$
declare
  c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.profiles'::regclass
     and contype = 'f'
     and confrelid = 'auth.users'::regclass;
  if c is not null then
    execute format('alter table public.profiles drop constraint %I', c);
  end if;
end $$;

create or replace function delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_balance numeric;
  v_busy    int;
begin
  -- Resolved once and rejected when null: an anonymous caller must not reach
  -- any of the checks below (see 0021 for why `<> auth.uid()` is not enough).
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- Money first: deleting must never strand a balance.
  select coalesce(balance, 0) into v_balance from wallets where owner_id = v_uid;
  if coalesce(v_balance, 0) > 0 then
    raise exception 'WALLET_NOT_EMPTY' using errcode = 'P0001', detail = v_balance::text;
  end if;

  -- Then work in flight, on either side: running, disputed, or with money
  -- still held in escrow.
  select count(*) into v_busy
    from jobs j
    left join escrows e on e.job_id = j.id
   where (j.owner_id = v_uid or j.hired_provider_id = v_uid)
     and (j.status in ('in_progress', 'disputed')
          or e.status in ('funded', 'materials_released'));
  if v_busy > 0 then
    raise exception 'ACTIVE_JOBS' using errcode = 'P0001', detail = v_busy::text;
  end if;

  -- Close what is merely open: the client's unhired jobs, the provider's
  -- unanswered quotes. Kept as records, not deleted, so providers who quoted
  -- still see what happened to their quote.
  update jobs set status = 'cancelled'
   where owner_id = v_uid and status in ('draft', 'posted', 'hiring');
  delete from quotes
   where provider_id = v_uid and status in ('submitted', 'revised');

  -- Scrub everything personal.
  delete from wallet_security where user_id = v_uid;
  delete from notifications where user_id = v_uid;
  update profiles
     set name             = 'Deleted user',
         avatar_url       = null,
         phone            = null,
         email            = null,
         bio              = null,
         location         = null,
         latitude         = null,
         longitude        = null,
         push_token       = null,
         business_name    = null,
         hourly_rate      = null,
         years_experience = null,
         skills           = '{}',
         availability     = 'offline',
         is_verified      = false,
         deleted_at       = now()
   where id = v_uid;
  -- `services` was added outside the migrations; clear it where it exists.
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles' and column_name = 'services') then
    execute 'update public.profiles set services = ''{}'' where id = $1' using v_uid;
  end if;

  -- Finally the login itself.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
