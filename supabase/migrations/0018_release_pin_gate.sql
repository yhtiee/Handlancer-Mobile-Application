-- Require the transfer PIN before any escrow release, not just withdrawals.
--
-- Releasing escrow hands the provider money the owner cannot claw back from
-- inside the app, which makes it exactly as consequential as a withdrawal - but
-- it was guarded only by a confirmation sheet. A phone left unlocked for a
-- minute was enough to empty an escrow.
--
-- The PIN is verified inside the same SECURITY DEFINER function that moves the
-- money, for the same reason as 0012: a client-side check is not a control, and
-- the single-argument versions are dropped so nothing can keep calling an
-- ungated path.

-- ───────────────── Shared PIN check ─────────────────
-- Lifted verbatim out of request_withdrawal so all three money paths enforce
-- identical rules. Internal only: it is called from other SECURITY DEFINER
-- functions, which run as the owner, so `authenticated` never needs the grant.
--
-- NOTE: the failed-attempt counter is written and then rolled back by the
-- exception this raises, so the 5-attempt lockout only ever latches via a path
-- that commits. That behaviour is carried over from 0012 unchanged rather than
-- redesigned here; a real fix needs the counter written in its own transaction.
create or replace function assert_transfer_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_sec wallet_security%rowtype;
begin
  select * into v_sec from wallet_security where user_id = auth.uid() for update;

  if v_sec.transfer_pin_hash is null then
    raise exception 'Set a transfer PIN before releasing funds'
      using hint = 'Wallet > Settings > Transfer PIN';
  end if;
  if v_sec.pin_locked_until is not null and v_sec.pin_locked_until > now() then
    raise exception 'Too many incorrect PIN attempts. Try again later.';
  end if;

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

  update wallet_security
     set pin_failed_attempts = 0, pin_locked_until = null, updated_at = now()
   where user_id = auth.uid();
end;
$$;

revoke all on function assert_transfer_pin(text) from public, anon, authenticated;

-- ───────────────── Materials release, now gated ─────────────────
drop function if exists release_materials(uuid);

create or replace function release_materials(p_job_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_provider uuid;
  v_escrow escrows%rowtype;
  v_pwallet wallets%rowtype;
begin
  select owner_id, hired_provider_id into v_owner, v_provider from jobs where id = p_job_id;
  if v_owner <> auth.uid() then raise exception 'Only the job owner can release funds'; end if;

  -- Before any state is read for update, so a wrong PIN costs nothing else.
  perform assert_transfer_pin(p_pin);

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status not in ('funded') then
    raise exception 'Escrow is not funded';
  end if;
  if v_escrow.materials_released then raise exception 'Materials already released'; end if;
  if v_escrow.materials_amount <= 0 then raise exception 'This quote has no materials'; end if;

  select * into v_pwallet from wallets where owner_id = v_provider for update;
  if v_pwallet.id is null then raise exception 'Provider wallet not found'; end if;

  update wallets set balance = balance + v_escrow.materials_amount where id = v_pwallet.id;
  insert into transactions (wallet_id, job_id, type, status, amount)
    values (v_pwallet.id, p_job_id, 'escrow_release', 'success', v_escrow.materials_amount);

  -- No notification insert here: `on_wallet_credit` (0004) already raises the
  -- 'escrow_release' notification off the transaction row above.
  update escrows set materials_released = true, status = 'materials_released' where id = v_escrow.id;
end;
$$;

-- ───────────────── Review + final release, now gated ─────────────────
drop function if exists review_and_release(uuid, int, text);

create or replace function review_and_release(
  p_job_id  uuid,
  p_rating  int,
  p_comment text,
  p_pin     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid;
  v_provider uuid;
begin
  select owner_id, hired_provider_id into v_owner, v_provider from jobs where id = p_job_id;
  if v_owner is null then raise exception 'Job not found'; end if;
  if v_owner <> auth.uid() then raise exception 'Only the job owner can release funds'; end if;
  if v_provider is null then raise exception 'No provider hired on this job'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  perform assert_transfer_pin(p_pin);

  insert into reviews (job_id, reviewer_id, provider_id, rating, comment)
    values (p_job_id, v_owner, v_provider, p_rating,
            nullif(btrim(coalesce(p_comment, '')), ''))
  on conflict (job_id, reviewer_id) do update
    set rating = excluded.rating, comment = excluded.comment;

  -- auth.uid() still resolves to the calling user inside SECURITY DEFINER, so the
  -- owner check inside release_workmanship passes exactly as a direct call would.
  perform release_workmanship(p_job_id);
end;
$$;

-- ───────────────── Close the bypass around both of them ─────────────────
-- `release_workmanship` pays out everything still held. It was granted to
-- `authenticated`, so a direct PostgREST call released the final payment with no
-- review and - after this migration - no PIN either, which would leave the gate
-- above decorative. It is only ever meant to be reached through
-- review_and_release, which runs as the owner and so needs no grant.
revoke all on function release_workmanship(uuid) from public, anon, authenticated;

grant execute on function release_materials(uuid, text)             to authenticated;
grant execute on function review_and_release(uuid, int, text, text) to authenticated;
