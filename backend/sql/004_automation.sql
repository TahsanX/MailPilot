-- Supports the LangGraph/LangChain automation service (replaces Make.com). Idempotent.

begin;

-- One row per user. Holds what the automation service needs to reach Gmail and Telegram on
-- their behalf. gmail_history_id is the Gmail History API cursor, so each run only fetches
-- messages that arrived since the last one instead of rescanning the whole inbox.
create table if not exists integrations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references users(id) on delete cascade,
  gmail_email         text,
  gmail_refresh_token text,
  gmail_history_id    text,
  telegram_chat_id    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Short-lived codes shown in the dashboard so a user can link their Telegram account by
-- sending "/link <code>" to the bot, without the bot needing to know who they are in advance.
create table if not exists telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table integrations        enable row level security;
alter table telegram_link_codes enable row level security;

commit;
