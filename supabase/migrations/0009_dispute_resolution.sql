-- Admin resolution paths for disputed jobs.
--
-- Opening a dispute flips the job to `disputed`, and the client's escrow controls
-- only render on in_progress/completed — so today a disputed job's money has no
-- way out at all. These three functions are that way out.
--
-- Deliberately NOT granted to `authenticated`: there is no in-app admin yet, and
-- disputes are handled over email until the admin site exists. Only the service
-- role can execute them, which is what that future site will authenticate as.
-- Granting these to app users would let either party settle their own dispute.

alter table disputes add column if not exists resolution      text;
alter table disputes add column if not exists resolved_at     timestamptz;
alter table disputes add column if not exists refunded_amount numeric(12,2);
alter table disputes add column if not exists released_amount numeric(12,2);

/**
 * Shared settlement. Splits whatever is still held between the client (refund)
 * and the provider (release), then closes out the job and the dispute.
 *
 * `p_release_amount` is the provider's share; the remainder goes back to the
 * client. Passing 0 is a full refund, passing the whole balance is a full
 * release, and anything between is a split — so one function covers all three
 * outcomes and they can never disagree about how the maths is done.
 */
create or replace function admin_resolve_dispute(
  p_job_id         uuid,
  p_release_amount numeric,
  p_note           text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner     uuid;
  v_provider  uuid;
  v_title     text;
  v_escrow    escrows%rowtype;
  v_held      numeric;
  v_refund    numeric;
  v_cwallet   wallets%rowtype;
  v_pwallet   wallets%rowtype;
begin
  select owner_id, hired_provider_id, title
    into v_owner, v_provider, v_title
    from jobs where id = p_job_id;
  if v_owner is null then raise exception 'Job not found'; end if;

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null then raise exception 'No escrow on this job'; end if;
  if v_escrow.status in ('completed', 'refunded') then
    raise exception 'Escrow is already settled';
  end if;

  -- Whatever has not already been paid out. The final release pays everything
  -- still held, so once it has run there is nothing left to settle.
  v_held := case
    when v_escrow.workmanship_released then 0
    else v_escrow.total - (case when v_escrow.materials_released then v_escrow.materials_amount else 0 end)
  end;
  if v_held <= 0 then raise exception 'Nothing left in escrow to settle'; end if;

  if p_release_amount is null or p_release_amount < 0 or p_release_amount > v_held then
    raise exception 'Release amount must be between 0 and %', v_held;
  end if;
  v_refund := v_held - p_release_amount;

  if p_release_amount > 0 then
    if v_provider is null then raise exception 'No provider hired on this job'; end if;
    select * into v_pwallet from wallets where owner_id = v_provider for update;
    if v_pwallet.id is null then raise exception 'Provider wallet not found'; end if;

    update wallets set balance = balance + p_release_amount where id = v_pwallet.id;
    insert into transactions (wallet_id, job_id, type, status, amount)
      values (v_pwallet.id, p_job_id, 'payout', 'success', p_release_amount);
  end if;

  if v_refund > 0 then
    select * into v_cwallet from wallets where owner_id = v_owner for update;
    if v_cwallet.id is null then raise exception 'Client wallet not found'; end if;

    update wallets set balance = balance + v_refund where id = v_cwallet.id;
    -- Booked as a `fund` credit: the money is re-entering the client's spendable
    -- balance exactly as a top-up would, and txn_type has no 'refund' member.
    insert into transactions (wallet_id, job_id, type, status, amount)
      values (v_cwallet.id, p_job_id, 'fund', 'success', v_refund);
  end if;

  update escrows
     set workmanship_released = true,
         status = case when p_release_amount > 0 then 'completed' else 'refunded' end
   where id = v_escrow.id;

  update jobs
     set status = case when p_release_amount > 0 then 'completed' else 'cancelled' end
   where id = p_job_id;

  update disputes
     set status          = 'resolved',
         resolution      = p_note,
         resolved_at     = now(),
         refunded_amount = v_refund,
         released_amount = p_release_amount
   where job_id = p_job_id and status in ('open', 'in_review');

  -- Tell both sides what happened; a silent settlement is how support tickets start.
  insert into notifications (user_id, type, payload)
    values (v_owner, 'dispute_resolved',
      jsonb_build_object('job_id', p_job_id, 'title', v_title,
                         'refunded', v_refund, 'released', p_release_amount));
  if v_provider is not null then
    insert into notifications (user_id, type, payload)
      values (v_provider, 'dispute_resolved',
        jsonb_build_object('job_id', p_job_id, 'title', v_title,
                           'refunded', v_refund, 'released', p_release_amount));
  end if;
end;
$$;

/** Full refund to the client. */
create or replace function admin_refund_dispute(p_job_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform admin_resolve_dispute(p_job_id, 0, p_note);
end; $$;

/** Full release to the provider. */
create or replace function admin_release_dispute(p_job_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_escrow escrows%rowtype; v_held numeric;
begin
  select * into v_escrow from escrows where job_id = p_job_id;
  if v_escrow.id is null then raise exception 'No escrow on this job'; end if;
  v_held := case
    when v_escrow.workmanship_released then 0
    else v_escrow.total - (case when v_escrow.materials_released then v_escrow.materials_amount else 0 end)
  end;
  perform admin_resolve_dispute(p_job_id, v_held, p_note);
end; $$;

-- Service role only — see the header. No `authenticated` grant on purpose.
revoke all on function admin_resolve_dispute(uuid, numeric, text) from public, authenticated;
revoke all on function admin_refund_dispute(uuid, text)           from public, authenticated;
revoke all on function admin_release_dispute(uuid, text)          from public, authenticated;

grant execute on function admin_resolve_dispute(uuid, numeric, text) to service_role;
grant execute on function admin_refund_dispute(uuid, text)           to service_role;
grant execute on function admin_release_dispute(uuid, text)          to service_role;
