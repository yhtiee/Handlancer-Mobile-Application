-- Close two gaps left by 0020, neither of which is visible from the app.
--
-- 1. `create function` grants EXECUTE to PUBLIC by default. 0020 granted to
--    `authenticated` and never revoked PUBLIC, so `anon` could call
--    open_dispute as well.
--
-- 2. Inside it, the owner check was `v_job.owner_id <> auth.uid()`. For an
--    anonymous caller auth.uid() is NULL, so that comparison is NULL — and
--    `if NULL then raise` does NOT fire. The check was skipped entirely. What
--    actually stopped a dispute being filed was the NOT NULL on
--    `disputes.opened_by` rejecting the insert further down. That is an
--    accident of the schema, not an authorization control, and before hitting
--    it an anonymous caller could still tell "job not found" apart from "no
--    provider on this job" apart from "a posted job cannot be disputed" — a
--    probe for which job ids exist and what state they are in.
--
-- Both are fixed here: auth.uid() is resolved once, into a variable that is
-- explicitly rejected when null, and PUBLIC loses execute on every function the
-- dispute flow touches.

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
  v_uid      uuid := auth.uid();
begin
  -- Before anything is read. A null caller must never reach a comparison, since
  -- every `<>` against it silently yields NULL rather than true.
  if v_uid is null then
    raise exception 'Sign in to open a dispute';
  end if;

  select * into v_job from jobs where id = p_job_id for update;
  if v_job.id is null then raise exception 'Job not found'; end if;

  -- The dispute is the client's alternative to approving, so it is theirs to
  -- open. A provider unhappy with the client has a different problem and goes
  -- to support directly.
  if v_job.owner_id <> v_uid then
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
    v_uid,
    btrim(p_reason),
    nullif(btrim(coalesce(p_category, '')), ''),
    nullif(btrim(coalesce(p_desired_outcome, '')), ''),
    'HL-' || upper(substr(replace(v_id::text, '-', ''), 1, 8))
  )
  returning * into v_dispute;

  -- Freezes the money: every release path refuses on a disputed job, and the
  -- client's escrow controls only render on in_progress/completed.
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

-- ───────────────── Nobody but a signed-in user ─────────────────
-- `revoke from public` is the part that actually matters; `anon` is named as
-- well so the intent survives someone re-granting PUBLIC later.
revoke all on function open_dispute(uuid, text, text, text) from public, anon;
grant execute on function open_dispute(uuid, text, text, text) to authenticated;

-- The same PUBLIC default has been open on both money paths since 0018. They
-- fail safe today — an anonymous caller trips the "set a transfer PIN" branch
-- inside assert_transfer_pin, because it looks up wallet_security by a null
-- auth.uid() and finds no row — but that is the same accident as above, one
-- refactor away from not holding. `anon` has no business reaching either.
revoke all on function release_materials(uuid, text)             from public, anon;
revoke all on function review_and_release(uuid, int, text, text) from public, anon;
grant execute on function release_materials(uuid, text)             to authenticated;
grant execute on function review_and_release(uuid, int, text, text) to authenticated;
