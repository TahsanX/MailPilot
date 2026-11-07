-- MailPilot schema (plain PostgreSQL, runs on Supabase).
-- Run once in the Supabase SQL editor, or with: npm run migrate
-- Safe to re-run: every statement is idempotent.

begin;

-- ---------------------------------------------------------------- helpers
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------------ users
create table if not exists users (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null check (char_length(name) between 2 and 60),
  email            text        not null check (char_length(email) <= 254),
  password_hash    text        not null,
  -- Incremented on password reset so every older JWT stops working.
  token_version    integer     not null default 0,
  -- Set only when a Make.com scenario confirms the Gmail connection.
  gmail_connected  boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists users_name_lower_key  on users (lower(name));
create unique index if not exists users_email_lower_key on users (lower(email));

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();

-- -------------------------------------------------------------- job_roles
-- Profession and department answers, plus the HR and Customer Care preferences.
create table if not exists job_roles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references users(id) on delete cascade,
  profession            text not null check (profession in
                          ('private_service_holder','student','business_owner','freelancer','other')),
  -- 'neither' is stored as an empty array, matching the frontend contract.
  departments           text[] not null default '{}'
                          check (departments <@ array['hr','customer_care']::text[]),
  hr_enabled            boolean generated always as ('hr' = any(departments)) stored,
  care_enabled          boolean generated always as ('customer_care' = any(departments)) stored,
  hr_target_role        text not null default '',
  hr_job_description    text not null default '',
  care_service_context  text not null default '',
  care_response_tone    text not null default 'professional'
                          check (care_response_tone in ('professional','friendly','empathetic','direct')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Only private service holders can have departments.
  constraint job_roles_departments_need_private_service
    check (profession = 'private_service_holder' or cardinality(departments) = 0)
);

drop trigger if exists job_roles_set_updated_at on job_roles;
create trigger job_roles_set_updated_at before update on job_roles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- details
-- Knowledge base text collected at signup.
create table if not exists details (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references users(id) on delete cascade,
  company_name      text not null default '',
  company_overview  text not null default '',
  faqs              jsonb not null default '[]'::jsonb check (jsonb_typeof(faqs) = 'array'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists details_set_updated_at on details;
create trigger details_set_updated_at before update on details
  for each row execute function set_updated_at();

-- ----------------------------------------------------------- detail_files
-- One row per uploaded PDF. The file itself is NOT stored: it is sent to Gemini
-- once and only the generated summary is kept.
create table if not exists detail_files (
  id               uuid primary key default gen_random_uuid(),
  detail_id        uuid not null references details(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  original_name    text not null,
  mime_type        text not null default 'application/pdf',
  size_bytes       integer not null check (size_bytes > 0),
  summary          text,
  summary_status   text not null default 'pending'
                     check (summary_status in ('pending','processing','done','failed')),
  summary_error    text,
  created_at       timestamptz not null default now(),
  summarized_at    timestamptz
);

create index if not exists detail_files_user_idx   on detail_files (user_id);
create index if not exists detail_files_detail_idx on detail_files (detail_id);

-- -------------------------------------------------------- password_resets
create table if not exists password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  otp_hash    text not null,
  expires_at  timestamptz not null,
  attempts    smallint not null default 0,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists password_resets_user_idx on password_resets (user_id, created_at desc);

-- --------------------------------------------------------------- security
-- The API connects with the database owner role. Turning on row level security
-- with no policies blocks the public Supabase Data API (anon / authenticated keys)
-- from reading any of these tables.
alter table users           enable row level security;
alter table job_roles       enable row level security;
alter table details         enable row level security;
alter table detail_files    enable row level security;
alter table password_resets enable row level security;

commit;
