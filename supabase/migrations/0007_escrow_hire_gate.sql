-- Escrow funding is what actually hires a provider.
--
-- Approving a quote only moves the job to 'hiring'; nothing recorded *who* was
-- hired, so `jobs.hired_provider_id` stayed null forever on quote-based jobs.
-- That silently broke everything keyed off it: the provider's hired-jobs list,
-- the RLS policies granting them access to the job, the `hired` notification,
-- and — worst — the release functions, which looked up a wallet for a null
-- provider and credited nobody while escrow was already debited.
--
-- Funding now sets hired_provider_id in the same statement that moves the job to
-- 'in_progress', so money-in-escrow and provider-hired can never disagree.

-- ─────────────── Fund escrow for a job (job owner pays from wallet) ───────────────
create or replace function fund_escrow(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_quote quotes%rowtype;
  v_wallet wallets%rowtype;
begin
  select owner_id into v_owner from jobs where id = p_job_id;
  if v_owner is null then raise exception 'Job not found'; end if;
  if v_owner <> auth.uid() then raise exception 'Only the job owner can fund escrow'; end if;

  select * into v_quote from quotes where job_id = p_job_id and status = 'approved' limit 1;
  if v_quote.id is null then raise exception 'No approved quote to fund'; end if;

  if exists (select 1 from escrows where job_id = p_job_id and status <> 'pending') then
    raise exception 'Escrow already funded';
  end if;

  select * into v_wallet from wallets where owner_id = v_owner for update;
  if v_wallet.id is null then raise exception 'Wallet not found'; end if;
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

  -- One statement, so notify_hire() sees the provider and the new status together
  -- and fires the provider's 'hired' notification off this row.
  update jobs
     set hired_provider_id = v_quote.provider_id,
         status = 'in_progress'
   where id = p_job_id;
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
  -- Without this the wallet lookup below returns no row and the credit silently
  -- updates nothing, while escrow has already been debited.
  if v_provider is null then raise exception 'No provider hired on this job'; end if;

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
  if v_provider is null then raise exception 'No provider hired on this job'; end if;

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status in ('pending', 'completed', 'refunded') then
    raise exception 'Escrow is not active';
  end if;
  if v_escrow.workmanship_released then raise exception 'Final payment already released'; end if;

  v_remaining := v_escrow.total -
    (case when v_escrow.materials_released then v_escrow.materials_amount else 0 end);

  select * into v_pwallet from wallets where owner_id = v_provider for update;
  if v_pwallet.id is null then raise exception 'Provider wallet not found'; end if;

  update wallets set balance = balance + v_remaining where id = v_pwallet.id;
  insert into transactions (wallet_id, job_id, type, status, amount)
    values (v_pwallet.id, p_job_id, 'payout', 'success', v_remaining);

  update escrows set workmanship_released = true, status = 'completed' where id = v_escrow.id;
  update jobs set status = 'completed' where id = p_job_id;
end;
$$;

grant execute on function fund_escrow(uuid)         to authenticated;
grant execute on function release_materials(uuid)   to authenticated;
grant execute on function release_workmanship(uuid) to authenticated;

-- ─────────────── Make top-up crediting genuinely idempotent ───────────────
-- Flutterwave retries webhooks, and flutterwave-webhook guards against double
-- crediting with a check-then-insert on `reference`. Two retries arriving at once
-- both pass the check and credit the wallet twice. A unique index turns the second
-- insert into an error instead of duplicated money.
create unique index if not exists transactions_reference_key
  on transactions (reference)
  where reference is not null;
