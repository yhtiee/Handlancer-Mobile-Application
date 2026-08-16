-- Return the lock as a boolean the server has already evaluated.
--
-- The client was comparing `pin_locked_until` against `Date.now()` while
-- rendering, which is an impure render (and would also drift with device clock
-- skew). Postgres already knows the time and is the side that enforces the lock,
-- so it should be the side that answers the question.

drop function if exists wallet_security_status();

create or replace function wallet_security_status()
returns table (
  has_pin          boolean,
  pin_locked       boolean,
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
    coalesce(s.pin_locked_until > now(), false),
    s.pin_locked_until,
    s.account_number is not null and s.bank_code is not null,
    s.bank_name,
    s.account_name,
    case when s.account_number is null then null
         else '••••' || right(s.account_number, 4) end
  from wallet_security s
  where s.user_id = auth.uid();
$$;

grant execute on function wallet_security_status() to authenticated;
