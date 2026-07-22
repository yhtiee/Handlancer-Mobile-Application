-- HandLancer reviews aggregation + proof-of-work media storage.

-- ─────────────── Keep profiles.rating in sync with reviews ───────────────
create or replace function recalc_provider_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider uuid;
begin
  v_provider := coalesce(new.provider_id, old.provider_id);
  update profiles
    set rating = coalesce(
      (select round(avg(rating)::numeric, 1) from reviews where provider_id = v_provider),
      0)
    where id = v_provider;
  return null;
end;
$$;

create trigger on_review_change
  after insert or update or delete on reviews
  for each row execute function recalc_provider_rating();

-- ─────────────── Storage bucket for before/after proof media ───────────────
insert into storage.buckets (id, name, public)
  values ('job-media', 'job-media', true)
  on conflict (id) do nothing;

create policy "job-media public read" on storage.objects
  for select to public using (bucket_id = 'job-media');

create policy "job-media authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'job-media');

create policy "job-media owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'job-media' and owner = auth.uid());
