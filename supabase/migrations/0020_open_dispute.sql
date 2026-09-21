-- Opening a dispute: one atomic server-side step that also tells the provider.
--
-- The client used to do this in two round trips — insert into `disputes`, then
-- update `jobs.status`. Either half could land without the other, leaving a
-- dispute row on a job still marching towards "approve & pay", or a frozen job
-- with no ticket behind it, and neither is repairable from inside the app.
--
-- More importantly the provider was never told. `notifications` has no insert
-- policy for `authenticated` (0001) — deliberately, since users must not be able
-- to write into each other's feeds — so the client physically cannot create the
-- row that feeds the push pipeline. Only a SECURITY DEFINER function can, which
-- is what this is. The provider's notification is now as certain as the status
-- change itself: same transaction, same rollback.

-- ───────────────── What a ticket carries ─────────────────
-- `reason` alone was not enough to triage on. Support asks the same three things
-- every time, so they are columns rather than prose the reporter may or may not
-- have included.
alter table disputes add column if not exists category        text;
alter table disputes add column if not exists desired_outcome text;

-- Quoted back over email and read aloud over WhatsApp, so it has to be short,
-- unambiguous and fixed for the life of the row.
alter table disputes add column if not exists reference text;

-- Backfill, so pre-existing tickets can still be quoted.
update disputes
   set reference = 'HL-' || upper(substr(replace(id::text, '-', ''), 1, 8))
 where reference is null;

-- Nothing stopped a job accumulating tickets before now — the old client wrote
-- the row straight from the app, so a double tap filed two. They have to be
-- merged before the index below can exist, or this migration aborts on the first
-- environment that has one. The oldest per job wins: it is the one support has
-- most likely already been quoted.
update disputes d
   set status     = 'rejected',
       resolution = coalesce(d.resolution, 'Closed automatically: duplicate ticket on the same job.'),
       resolved_at = coalesce(d.resolved_at, now())
 where d.status in ('open', 'in_review')
   and d.id <> (
     select keep.id from disputes keep
      where keep.job_id = d.job_id
        and keep.status in ('open', 'in_review')
      order by keep.created_at asc, keep.id asc
      limit 1
   );

-- One live ticket per job. Without this, a double tap on "open dispute" — or two
-- devices racing — files two tickets support has to reconcile by hand.
-- Partial on the live statuses only: a job that was disputed, resolved and then
-- went wrong again deserves a fresh ticket.
create unique index if not exists disputes_one_open_per_job
  on disputes (job_id) where status in ('open', 'in_review');

-- ───────────────── Open a dispute ─────────────────
create or replace function open_dispute(
  p_job_id          uuid,
  p_reason          text,
  p_category        text default null,
  p_desired_outcome text default null
)
returns disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job      jobs%rowtype;
  v_dispute  disputes%rowtype;
  v_id       uuid := gen_random_uuid();
begin
  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job not found'; end if;

  -- The dispute is the client's alternative to approving, so it is theirs to
  -- open. A provider unhappy with the client has a different problem and goes
  -- to support directly.
  if v_job.owner_id <> auth.uid() then
    raise exception 'Only the job owner can open a dispute';
  end if;
  if v_job.hired_provider_id is null then
    raise exception 'There is no provider on this job to dispute';
  end if;

  -- Re-opening the same ticket is not a new ticket. Returning the existing row
  -- rather than raising keeps the screen idempotent: a user who backgrounds the
  -- app mid-submit and taps again gets their reference, not an error.
  --
  -- This has to come BEFORE the status gate. The first call already moved the
  -- job to `disputed`, so checking status first would reject every return visit
  -- with "a disputed job cannot be disputed" and the idempotent path would be
  -- dead code — which is exactly the case it exists for.
  select * into v_dispute
    from disputes
   where job_id = p_job_id and status in ('open', 'in_review')
   limit 1;
  if v_dispute.id is not null then
    return v_dispute;
  end if;

  -- Available exactly where approval is available: work underway, or work the
  -- provider has marked finished and is waiting to be paid for. A job sitting
  -- at `disputed` with no live ticket is a broken state, not a second chance,
  -- so it lands here and raises rather than filing a fresh ticket over it.
  if v_job.status not in ('in_progress', 'completed') then
    raise exception 'A % job cannot be disputed', v_job.status;
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Please describe what went wrong';
  end if;

  insert into disputes (id, job_id, opened_by, reason, category, desired_outcome, reference)
  values (
    v_id,
    p_job_id,
    auth.uid(),
    btrim(p_reason),
    nullif(btrim(coalesce(p_category, '')), ''),
    nullif(btrim(coalesce(p_desired_outcome, '')), ''),
    'HL-' || upper(substr(replace(v_id::text, '-', ''), 1, 8))
  )
  returning * into v_dispute;

  -- Freezes the money: every release path below refuses on a disputed job, and
  -- the client's escrow controls only render on in_progress/completed.
  update jobs set status = 'disputed' where id = p_job_id;

  -- The provider learns this from the app, not from the silence where their
  -- payment used to be. This insert is what the push trigger (0016) fires on.
  --
  -- The reporter's own words are deliberately NOT in the payload: it travels to
  -- a lock screen, and an accusation is support's to relay once they have heard
  -- both sides. The provider gets the fact, the reference and the category.
  insert into notifications (user_id, type, payload)
  values (
    v_job.hired_provider_id,
    'dispute_opened',
    jsonb_build_object(
      'job_id',     p_job_id,
      'title',      v_job.title,
      'dispute_id', v_dispute.id,
      'reference',  v_dispute.reference,
      'category',   v_dispute.category
    )
  );

  return v_dispute;
end;
$$;

grant execute on function open_dispute(uuid, text, text, text) to authenticated;

-- ───────────────── Disputed money does not move ─────────────────
-- Neither release path checked job status, so a disputed job's escrow could
-- still be paid out by whoever reached the review screen — which makes the
-- dispute decorative. Both functions are reproduced from 0018 verbatim with one
-- guard added; `admin_resolve_dispute` (0009) is the only way out of a disputed
-- job, and it does not go through either of these.
create or replace function assert_not_disputed(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_status job_status;
begin
  select status into v_status from jobs where id = p_job_id;
  if v_status = 'disputed' then
    raise exception 'This job is under dispute — support settles the escrow'
      using hint = 'Contact support@handlancer.com with your dispute reference';
  end if;
end;
$$;

revoke all on function assert_not_disputed(uuid) from public, anon, authenticated;

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

  perform assert_not_disputed(p_job_id);

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

  perform assert_not_disputed(p_job_id);
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

grant execute on function release_materials(uuid, text)             to authenticated;
grant execute on function review_and_release(uuid, int, text, text) to authenticated;

-- ───────────────── Realtime ─────────────────
-- The client's job screen swaps "Report a problem" for the open ticket, and the
-- provider's shows the disputed banner; both read `disputes`, so the row needs
-- to reach the app the same way jobs and escrows do. Guarded like 0015 — adding
-- a table already in the publication is an error, not a no-op.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'disputes'
  ) then
    execute 'alter publication supabase_realtime add table public.disputes';
  end if;
end;
$$;

-- Resolution flips `status` on an existing row, so the app needs the old row to
-- tell an update apart from an insert. Same reason as jobs/quotes in 0015.
alter table disputes replica identity full;
