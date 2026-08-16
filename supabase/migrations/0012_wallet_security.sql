-- Server-side withdrawal security: transfer PIN + verified bank account.
--
-- Replaces a client-only control. The PIN previously lived in device SecureStore
-- as plaintext and was checked in JavaScript; `request_withdrawal` never saw it,
-- so any direct PostgREST call withdrew without one. Verification now happens
-- inside the same function that moves the money, where it cannot be skipped.
--
-- These columns deliberately do NOT go on `profiles`: that table is readable by
-- every authenticated user (`profiles readable ... using (true)`), which would
-- publish the bcrypt hash — a 4-digit PIN is brute-forced offline in
-- milliseconds — along with everyone's bank account number.
--
-- This table has RLS enabled and NO policies. That is intentional: clients get no
-- direct read or write path at all, only the SECURITY DEFINER functions below.
-- (service_role bypasses RLS, which is how the future admin site reaches it.)

create extension if not exists pgcrypto;

create table if not exists wallet_security (
  user_id             uuid primary key references profiles(id) on delete cascade,
  transfer_pin_hash   text,
  pin_set_at          timestamptz,
  pin_failed_attempts int default 0,
  pin_locked_until    timestamptz,
  bank_code           text,
  bank_name           text,
  account_number      text,
  account_name        text,
  bank_verified_at    timestamptz,
  updated_at          timestamptz default now()
);

alter table wallet_security enable row level security;

-- Carry over anything already captured on profiles so nobody has to re-enter it.
insert into wallet_security (user_id, bank_name, account_number, account_name)
select id, bank_name, account_number, account_name
  from profiles
 where account_number is not null
on conflict (user_id) do nothing;

-- The plaintext copies on `profiles` are world-readable; now that the real ones
-- live here, drop them rather than leave bank details exposed.
alter table profiles
  drop column if exists bank_name,
  drop column if exists account_number,
  drop column if exists account_name;

-- ─────────────── Status (safe to expose) ───────────────
-- Returns only booleans and a masked account number — never the hash, never the
-- full account number.
create or replace function wallet_security_status()
returns table (
  has_pin          boolean,
  pin_locked_until timestamptz,
  has_bank         boolean,
  bank_name        text,
  account_name     text,
  account_masked   text
)
language sql
security definer
set search_path = public
as $$
  select
    s.transfer_pin_hash is not null,
    s.pin_locked_until,
    s.account_number is not null and s.bank_code is not null,
    s.bank_name,
    s.account_name,
    case when s.account_number is null then null
         else '••••' || right(s.account_number, 4) end
  from wallet_security s
  where s.user_id = auth.uid();
$$;

-- ─────────────── Set / change the transfer PIN ───────────────
create or replace function set_transfer_pin(p_pin text, p_current_pin text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_row wallet_security%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must be exactly 4 digits'; end if;
  -- Rejects 1111-style repeats and 1234/4321 runs.
  if p_pin ~ '^(.)\1{3}$' or p_pin in ('1234', '2345', '3456', '4567', '5678', '6789', '0123',
                                       '9876', '8765', '7654', '6543', '5432', '4321', '3210') then
    raise exception 'Choose a less predictable PIN';
  end if;

  select * into v_row from wallet_security where user_id = auth.uid() for update;

  -- Changing an existing PIN requires proving you know the old one.
  if v_row.transfer_pin_hash is not null then
    if p_current_pin is null
       or v_row.transfer_pin_hash <> crypt(p_current_pin, v_row.transfer_pin_hash) then
      raise exception 'Current PIN is incorrect';
    end if;
  end if;

  insert into wallet_security (user_id, transfer_pin_hash, pin_set_at,
                               pin_failed_attempts, pin_locked_until)
    values (auth.uid(), crypt(p_pin, gen_salt('bf')), now(), 0, null)
  on conflict (user_id) do update
    set transfer_pin_hash   = excluded.transfer_pin_hash,
        pin_set_at          = now(),
        pin_failed_attempts = 0,
        pin_locked_until    = null,
        updated_at          = now();
end;
$$;

-- ─────────────── Save a bank account verified by the Edge Function ───────────────
-- Called only by flutterwave-bank after Flutterwave resolved the account name, so
-- `account_name` is the bank's answer rather than anything the user typed.
create or replace function save_bank_account(
  p_user_id        uuid,
  p_bank_code      text,
  p_bank_name      text,
  p_account_number text,
  p_account_name   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_account_number !~ '^[0-9]{10}$' then
    raise exception 'Account number must be 10 digits';
  end if;

  insert into wallet_security (user_id, bank_code, bank_name, account_number,
                               account_name, bank_verified_at)
    values (p_user_id, p_bank_code, p_bank_name, p_account_number, p_account_name, now())
  on conflict (user_id) do update
    set bank_code        = excluded.bank_code,
        bank_name        = excluded.bank_name,
        account_number   = excluded.account_number,
        account_name     = excluded.account_name,
        bank_verified_at = now(),
        updated_at       = now();
end;
$$;

-- ─────────────── Withdrawal, now gated ───────────────
-- Same signature shape as before plus the PIN. The old 1-arg version is dropped
-- so nothing can keep calling the ungated path.
drop function if exists request_withdrawal(numeric);

create or replace function request_withdrawal(p_amount numeric, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet wallets%rowtype;
  v_sec    wallet_security%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid amount'; end if;

  select * into v_sec from wallet_security where user_id = auth.uid() for update;

  if v_sec.account_number is null or v_sec.bank_code is null then
    raise exception 'Add a bank account before withdrawing';
  end if;
  if v_sec.transfer_pin_hash is null then
    raise exception 'Set a transfer PIN before withdrawing';
  end if;
  if v_sec.pin_locked_until is not null and v_sec.pin_locked_until > now() then
    raise exception 'Too many incorrect PIN attempts. Try again later.';
  end if;

  -- Wrong PIN costs an attempt and, at the limit, a 15-minute lockout. The
  -- counter is committed by the exception being raised *after* the update, so a
  -- caller cannot burn attempts for free by aborting.
  if v_sec.transfer_pin_hash <> crypt(p_pin, v_sec.transfer_pin_hash) then
    update wallet_security
       set pin_failed_attempts = coalesce(pin_failed_attempts, 0) + 1,
           pin_locked_until = case
             when coalesce(pin_failed_attempts, 0) + 1 >= 5 then now() + interval '15 minutes'
             else pin_locked_until end,
           updated_at = now()
     where user_id = auth.uid();
    raise exception 'Incorrect PIN';
  end if;

  select * into v_wallet from wallets where owner_id = auth.uid() for update;
  if v_wallet.id is null then raise exception 'Wallet not found'; end if;
  if v_wallet.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update wallet_security
     set pin_failed_attempts = 0, pin_locked_until = null, updated_at = now()
   where user_id = auth.uid();

  update wallets set balance = balance - p_amount where id = v_wallet.id;
  insert into transactions (wallet_id, type, status, amount)
    values (v_wallet.id, 'withdraw', 'pending', p_amount);
end;
$$;

grant execute on function wallet_security_status()               to authenticated;
grant execute on function set_transfer_pin(text, text)           to authenticated;
grant execute on function request_withdrawal(numeric, text)      to authenticated;

-- Only the Edge Function (service_role) may write a bank account: it is the only
-- caller that has actually verified the account with Flutterwave.
revoke all on function save_bank_account(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function save_bank_account(uuid, text, text, text, text) to service_role;
