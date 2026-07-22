-- HandLancer initial schema
-- Run with: supabase db push  (or paste into the Supabase SQL editor)

-- ─────────────────────────── Enums ───────────────────────────
create type user_role        as enum ('user', 'provider');
create type job_status        as enum ('draft', 'posted', 'hiring', 'in_progress', 'completed', 'disputed', 'cancelled');
create type quote_status       as enum ('submitted', 'approved', 'rejected', 'revised');
create type escrow_status      as enum ('pending', 'funded', 'materials_released', 'completed', 'refunded');
create type txn_type           as enum ('fund', 'withdraw', 'escrow_hold', 'escrow_release', 'payout');
create type txn_status         as enum ('pending', 'success', 'failed');
create type media_phase        as enum ('before', 'after');
create type media_kind         as enum ('photo', 'video');
create type dispute_status      as enum ('open', 'in_review', 'resolved', 'rejected');

-- ─────────────────────────── Profiles ───────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        user_role not null,
  name        text,
  avatar_url  text,
  phone       text,
  email       text,
  bio         text,
  location    text,
  skills      text[] default '{}',
  rating      numeric(2,1) default 0,
  created_at  timestamptz default now()
);

-- ─────────────────────────── Jobs ───────────────────────────
create table jobs (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references profiles(id) on delete cascade,
  title              text not null,
  description        text,
  category           text,
  budget             numeric(12,2),
  location           text,
  is_direct          boolean default false,
  hired_provider_id  uuid references profiles(id),
  status             job_status default 'draft',
  scheduled_for      timestamptz,
  created_at         timestamptz default now()
);
create index on jobs (owner_id);
create index on jobs (status);
create index on jobs (hired_provider_id);

-- ─────────────────────────── Quotes ───────────────────────────
create table quotes (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references jobs(id) on delete cascade,
  provider_id     uuid not null references profiles(id) on delete cascade,
  line_items      jsonb default '[]',     -- [{ label, type: 'material'|'labor', amount }]
  materials_cost  numeric(12,2) default 0,
  labor_cost      numeric(12,2) default 0,
  total           numeric(12,2) default 0,
  message         text,
  status          quote_status default 'submitted',
  created_at      timestamptz default now(),
  unique (job_id, provider_id)
);
create index on quotes (job_id);
create index on quotes (provider_id);

-- ─────────────────────────── Escrow ───────────────────────────
create table escrows (
  id                   uuid primary key default gen_random_uuid(),
  job_id               uuid not null references jobs(id) on delete cascade unique,
  total                numeric(12,2) not null,
  materials_amount     numeric(12,2) default 0,
  materials_released   boolean default false,
  workmanship_released boolean default false,
  status               escrow_status default 'pending',
  created_at           timestamptz default now()
);

-- ─────────────────────────── Wallet ───────────────────────────
create table wallets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade unique,
  balance     numeric(12,2) default 0,
  currency    text default 'NGN',
  created_at  timestamptz default now()
);

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  wallet_id   uuid not null references wallets(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  type        txn_type not null,
  status      txn_status default 'pending',
  amount      numeric(12,2) not null,
  reference   text,                       -- Flutterwave tx_ref
  created_at  timestamptz default now()
);
create index on transactions (wallet_id);

-- ─────────────────────────── Chat ───────────────────────────
create table conversations (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references jobs(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  provider_id  uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (job_id, user_id, provider_id)
);

create table messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references profiles(id) on delete cascade,
  body             text not null,
  created_at       timestamptz default now()
);
create index on messages (conversation_id);

-- ─────────────────────────── Reviews ───────────────────────────
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  reviewer_id   uuid not null references profiles(id) on delete cascade,
  provider_id   uuid not null references profiles(id) on delete cascade,
  rating        int not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now(),
  unique (job_id, reviewer_id)
);

-- ─────────────────────────── Proof of work ───────────────────────────
create table job_media (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  provider_id uuid not null references profiles(id) on delete cascade,
  phase       media_phase not null,
  kind        media_kind not null,
  url         text not null,
  created_at  timestamptz default now()
);
create index on job_media (job_id);
create index on job_media (provider_id);

-- ─────────────────────────── Notifications ───────────────────────────
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb default '{}',
  read        boolean default false,
  created_at  timestamptz default now()
);
create index on notifications (user_id);

-- ─────────────────────────── Disputes ───────────────────────────
create table disputes (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  opened_by   uuid not null references profiles(id) on delete cascade,
  reason      text,
  status      dispute_status default 'open',
  created_at  timestamptz default now()
);

-- ═══════════════════════ Row-Level Security ═══════════════════════
alter table profiles      enable row level security;
alter table jobs          enable row level security;
alter table quotes        enable row level security;
alter table escrows       enable row level security;
alter table wallets       enable row level security;
alter table transactions  enable row level security;
alter table conversations enable row level security;
alter table messages      enable row level security;
alter table reviews       enable row level security;
alter table job_media     enable row level security;
alter table notifications enable row level security;
alter table disputes      enable row level security;

-- Profiles: anyone authenticated can read (discovery); owner can write own row.
create policy "profiles readable" on profiles for select to authenticated using (true);
create policy "profile self upsert" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profile self update" on profiles for update to authenticated using (id = auth.uid());

-- Jobs: posted/hiring jobs are publicly visible to providers; owners see all their jobs.
create policy "jobs visible" on jobs for select to authenticated
  using (owner_id = auth.uid() or hired_provider_id = auth.uid() or status in ('posted','hiring'));
create policy "jobs owner insert" on jobs for insert to authenticated with check (owner_id = auth.uid());
create policy "jobs owner update" on jobs for update to authenticated
  using (owner_id = auth.uid() or hired_provider_id = auth.uid());

-- Quotes: job owner and the quoting provider can see/manage.
create policy "quotes visible" on quotes for select to authenticated
  using (provider_id = auth.uid() or job_id in (select id from jobs where owner_id = auth.uid()));
create policy "quotes provider insert" on quotes for insert to authenticated with check (provider_id = auth.uid());
create policy "quotes party update" on quotes for update to authenticated
  using (provider_id = auth.uid() or job_id in (select id from jobs where owner_id = auth.uid()));

-- Escrow: visible to the job's two parties.
create policy "escrow visible" on escrows for select to authenticated
  using (job_id in (select id from jobs where owner_id = auth.uid() or hired_provider_id = auth.uid()));

-- Wallet & transactions: owner only.
create policy "wallet self" on wallets for select to authenticated using (owner_id = auth.uid());
create policy "txn self" on transactions for select to authenticated
  using (wallet_id in (select id from wallets where owner_id = auth.uid()));

-- Conversations & messages: only the two participants.
create policy "convo party" on conversations for select to authenticated
  using (user_id = auth.uid() or provider_id = auth.uid());
create policy "convo create" on conversations for insert to authenticated
  with check (user_id = auth.uid() or provider_id = auth.uid());
create policy "messages party read" on messages for select to authenticated
  using (conversation_id in (select id from conversations where user_id = auth.uid() or provider_id = auth.uid()));
create policy "messages party send" on messages for insert to authenticated
  with check (sender_id = auth.uid() and conversation_id in
    (select id from conversations where user_id = auth.uid() or provider_id = auth.uid()));

-- Reviews: publicly readable (résumé), reviewer writes own.
create policy "reviews readable" on reviews for select to authenticated using (true);
create policy "reviews self insert" on reviews for insert to authenticated with check (reviewer_id = auth.uid());

-- Job media: publicly readable (résumé), provider uploads own.
create policy "media readable" on job_media for select to authenticated using (true);
create policy "media provider insert" on job_media for insert to authenticated with check (provider_id = auth.uid());

-- Notifications: owner only.
create policy "notif self" on notifications for select to authenticated using (user_id = auth.uid());
create policy "notif self update" on notifications for update to authenticated using (user_id = auth.uid());

-- Disputes: parties to the job.
create policy "dispute party" on disputes for select to authenticated
  using (job_id in (select id from jobs where owner_id = auth.uid() or hired_provider_id = auth.uid()));
create policy "dispute open" on disputes for insert to authenticated with check (opened_by = auth.uid());

-- ═══════════════════════ Triggers ═══════════════════════
-- Auto-create a wallet whenever a profile is created.
create or replace function handle_new_profile() returns trigger as $$
begin
  insert into wallets (owner_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created after insert on profiles
  for each row execute function handle_new_profile();
