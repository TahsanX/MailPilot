-- Dashboard data and login by email. Idempotent.

begin;

-- Login is by email now, so names no longer need to be unique.
drop index if exists users_name_lower_key;

-- ---------------------------------------------------------- email_activity
-- One row per processed email. Written by Make.com (POST /api/webhooks/make/emails),
-- or by the sample data loader (is_sample = true).
create table if not exists email_activity (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  email_id           text not null,
  thread_id          text not null,
  received_at        timestamptz not null,
  sender_name        text not null default '',
  sender_email       text not null default '',
  subject            text not null default '',
  priority           text not null check (priority in ('urgent','medium','low')),
  category           text not null check (category in ('promotional','productive','transactional','personal','other')),
  pipeline           text not null default 'general' check (pipeline in ('general','hr','customer_care')),
  summary            text not null default '',
  action_required    boolean not null default false,
  reply_needed       boolean not null default false,
  draft_created      boolean not null default false,
  status             text not null default 'pending'
                       check (status in ('unread','draft_ready','pending','handled','overdue','delegated')),
  -- First matching outgoing reply in the thread, if any. Used for response time.
  replied_at         timestamptz,
  -- Set when the user marks the email handled in the dashboard.
  handled_at         timestamptz,
  meeting_created    boolean not null default false,
  cv_processed       boolean not null default false,
  automation_outcome text not null default 'not_started'
                       check (automation_outcome in ('not_started','completed','failed','needs_human')),
  is_sample          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, email_id)
);

create index if not exists email_activity_user_received_idx on email_activity (user_id, received_at desc);

drop trigger if exists email_activity_set_updated_at on email_activity;
create trigger email_activity_set_updated_at before update on email_activity
  for each row execute function set_updated_at();

-- -------------------------------------------------------------- candidates
-- CV details read from HR emails. Empty fields stay empty strings, never guessed.
create table if not exists candidates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  email_id        text not null,
  candidate_name  text not null default '',
  role            text not null default '',
  experience      text not null default '',
  education       text not null default '',
  projects        text not null default '',
  recommendation  text not null default '',
  sender_email    text not null default '',
  cv_filename     text not null default '',
  received_at     timestamptz not null,
  is_sample       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, email_id)
);

create index if not exists candidates_user_received_idx on candidates (user_id, received_at desc);

alter table email_activity enable row level security;
alter table candidates     enable row level security;

commit;
