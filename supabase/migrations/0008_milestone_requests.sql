-- Provider-initiated milestone requests, and a combined review + final release.
--
-- Releasing money stays owner-only. What the provider gains is a way to *ask*:
-- once for the materials portion, and again once the work is finished. Each
-- request stamps the escrow and notifies the owner; no funds move until the owner
-- acts, so the provider can never pay themselves.
--
-- The request state lives on `escrows` rather than as new `job_status` values, so
-- the status enum, JobStatusPill, list filters and every RLS policy that
-- enumerates statuses stay untouched.

alter table escrows add column if not exists materials_requested_at  timestamptz;
alter table escrows add column if not exists completion_requested_at timestamptz;

-- ─────────────── Provider asks for the materials portion ───────────────
create or replace function request_materials_release(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid;
  v_provider uuid;
  v_title    text;
  v_escrow   escrows%rowtype;
begin
  select owner_id, hired_provider_id, title
    into v_owner, v_provider, v_title
    from jobs where id = p_job_id;
  if v_provider is null or v_provider <> auth.uid() then
    raise exception 'Only the hired provider can request funds';
  end if;

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status <> 'funded' then
    raise exception 'Escrow is not funded';
  end if;
  if v_escrow.materials_amount <= 0 then raise exception 'This quote has no materials'; end if;
  if v_escrow.materials_released then raise exception 'Materials already released'; end if;

  update escrows set materials_requested_at = now() where id = v_escrow.id;

  insert into notifications (user_id, type, payload)
    values (v_owner, 'materials_requested',
      jsonb_build_object('job_id', p_job_id, 'title', v_title,
                         'amount', v_escrow.materials_amount));
end;
$$;

-- ─────────────── Provider marks the work finished ───────────────
create or replace function request_completion_review(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner    uuid;
  v_provider uuid;
  v_title    text;
  v_escrow   escrows%rowtype;
begin
  select owner_id, hired_provider_id, title
    into v_owner, v_provider, v_title
    from jobs where id = p_job_id;
  if v_provider is null or v_provider <> auth.uid() then
    raise exception 'Only the hired provider can request a review';
  end if;

  select * into v_escrow from escrows where job_id = p_job_id for update;
  if v_escrow.id is null or v_escrow.status in ('pending', 'completed', 'refunded') then
    raise exception 'Escrow is not active';
  end if;
  if v_escrow.workmanship_released then raise exception 'Final payment already released'; end if;

  update escrows set completion_requested_at = now() where id = v_escrow.id;

  insert into notifications (user_id, type, payload)
    values (v_owner, 'completion_requested',
      jsonb_build_object('job_id', p_job_id, 'title', v_title));
end;
$$;

-- ─────────────── Owner reviews the work and releases the final payment ───────────────
-- Both halves run in one transaction: if the release raises, the review rolls back
-- with it, so a job can never end up rated-but-unpaid or reviewed twice on a retry.
create or replace function review_and_release(
  p_job_id  uuid,
  p_rating  int,
  p_comment text default null
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

grant execute on function request_materials_release(uuid)     to authenticated;
grant execute on function request_completion_review(uuid)     to authenticated;
grant execute on function review_and_release(uuid, int, text) to authenticated;
