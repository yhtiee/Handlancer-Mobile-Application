-- Provider profile: rate & experience surfaced on the public profile screen.
-- Run with: supabase db push  (or paste into the Supabase SQL editor)

alter table profiles
  add column if not exists hourly_rate      numeric(12,2),
  add column if not exists years_experience int;

-- Existing RLS already allows authenticated reads of every profile row and
-- self-updates, so these columns inherit the right policies — no changes needed.
