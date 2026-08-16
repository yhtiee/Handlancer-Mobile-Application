-- Add the two provider fields the app has always assumed existed.
--
-- `Profile` in database.types.ts declares `hourly_rate` and `years_experience`,
-- the edit-profile screen holds state for them, and the provider profile screen
-- renders "N years Experience" from one — but neither column was ever created.
-- Reads survived because `select('*')` simply omits them; any *filter* on them
-- fails with 42703, which is what the new browse filters would have hit.

alter table profiles
  add column if not exists hourly_rate      numeric(12,2),
  add column if not exists years_experience int;

-- Both are filtered and sorted on from the browse screen.
create index if not exists profiles_hourly_rate_idx
  on profiles (hourly_rate) where role = 'provider';
create index if not exists profiles_years_experience_idx
  on profiles (years_experience) where role = 'provider';
