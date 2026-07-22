-- HandLancer wallet & escrow ledger.
-- All balance changes go through these SECURITY DEFINER functions so clients can
-- never edit balances directly (wallets/transactions have no client write policies).

-- ─────────────── Fund escrow for a job (job owner pays from wallet) ───────────────
create or replace function fund_escrow(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_provider uuid;
  v_quote quotes%rowtype;
  v_wallet wallets%rowtype;
begin
  select owner_id, hired_provider_id into v_owner, v_provider from jobs where id = p_job_id;
  if v_owner is null then raise exception 'Job not found'; end if;
  if v_owner <> auth.uid() then raise exception 'Only the job owner can fund escrow'; end if;

  select * into v_quote from quotes where job_id = p_job_id and status = 'approved' limit 1;
  if v_quote.id is null then raise exception 'No approved quote to fund'; end if;

  if exists (select 1 from escrows where job_id = p_job_id and status <> 'pending') then
    raise exception 'Escrow already funded';
  end if;

  select * into v_wallet from wallets where owner_id = v_owner for update;
  if v_wallet.balance < v_quote.total then
    raise exception 'Insufficient wallet balance';
  end if;

  update wallets set balance = balance - v_quote.total where id = v_wallet.id;
  insert into transactions (wallet_id, job_id, type, status, amount)
    values (v_wallet.id, p_job_id, 'escrow_hold', 'success', v_quote.total);

  insert into escrows (job_id, total, materials_amount, status)
    values (p_job_id, v_quote.total, v_quote.materials_cost, 'funded')
    on conflict (job_id) do update
      set total = excluded.total,
          materials_amount = excluded.materials_amount,
          status = 'funded';

  update jobs set status = 'in_progress' where id = p_job_id;
end;
$$;

-- ─────────────── Release materials portion to the provider ───────────────
create or replace function release_materials(p_job_id uuid)
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

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status not in ('funded') then
    raise exception 'Escrow is not funded';
  end if;
  if v_escrow.materials_released then raise exception 'Materials already released'; end if;
  if v_escrow.materials_amount <= 0 then raise exception 'This quote has no materials'; end if;

  select * into v_pwallet from wallets where owner_id = v_provider for update;
  update wallets set balance = balance + v_escrow.materials_amount where id = v_pwallet.id;
  insert into transactions (wallet_id, job_id, type, status, amount)
    values (v_pwallet.id, p_job_id, 'escrow_release', 'success', v_escrow.materials_amount);

  update escrows set materials_released = true, status = 'materials_released' where id = v_escrow.id;
end;
$$;

-- ─────────────── Release final (workmanship) payment & complete the job ───────────────
create or replace function release_workmanship(p_job_id uuid)
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
  v_remaining numeric;
begin
  select owner_id, hired_provider_id into v_owner, v_provider from jobs where id = p_job_id;
  if v_owner <> auth.uid() then raise exception 'Only the job owner can release funds'; end if;

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status in ('pending', 'completed', 'refunded') then
    raise exception 'Escrow is not active';
  end if;
  if v_escrow.workmanship_released then raise exception 'Final payment already released'; end if;

  v_remaining := v_escrow.total -
    (case when v_escrow.materials_released then v_escrow.materials_amount else 0 end);

  select * into v_pwallet from wallets where owner_id = v_provider for update;
  update wallets set balance = balance + v_remaining where id = v_pwallet.id;
  insert into transactions (wallet_id, job_id, type, status, amount)
    values (v_pwallet.id, p_job_id, 'payout', 'success', v_remaining);

  update escrows set workmanship_released = true, status = 'completed' where id = v_escrow.id;
  update jobs set status = 'completed' where id = p_job_id;
end;
$$;

-- ─────────────── Request a withdrawal (debits now; payout settled by Edge Function) ───────────────
create or replace function request_withdrawal(p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet wallets%rowtype;
begin
  if p_amount <= 0 then raise exception 'Enter a valid amount'; end if;
  select * into v_wallet from wallets where owner_id = auth.uid() for update;
  if v_wallet.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update wallets set balance = balance - p_amount where id = v_wallet.id;
  insert into transactions (wallet_id, type, status, amount)
    values (v_wallet.id, 'withdraw', 'pending', p_amount);
end;
$$;

grant execute on function fund_escrow(uuid)        to authenticated;
grant execute on function release_materials(uuid)  to authenticated;
grant execute on function release_workmanship(uuid) to authenticated;
grant execute on function request_withdrawal(numeric) to authenticated;
