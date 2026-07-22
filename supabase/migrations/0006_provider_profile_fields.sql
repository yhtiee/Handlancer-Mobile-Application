-- Expanded Provider Profile Fields for HandLancer
alter table profiles
  add column if not exists latitude          numeric(10,7),
  add column if not exists longitude         numeric(10,7),
  add column if not exists service_radius_km int default 20,
  add column if not exists availability      text default 'available',
  add column if not exists business_name     text,
  add column if not exists bank_name         text,
  add column if not exists account_number    text,
  add column if not exists account_name      text,
  add column if not exists is_verified       boolean default false;
