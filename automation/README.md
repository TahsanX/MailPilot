# MailPilot automation service

Replaces Make.com. A Python service, deployed as its own Vercel project, that reads Gmail,
classifies and drafts replies with a LangGraph pipeline (Gemini under the hood, LangSmith tracing
optional), extracts CVs for the HR pipeline, sends urgent alerts to Telegram, and writes everything
into the **same Supabase tables** (`email_activity`, `candidates`) the Node backend's dashboard
already reads. The dashboard needs no changes.

## Why a separate Vercel project

The Node API (`backend/`) and this service are independent deployments from the same GitHub repo,
both pointed at the same Supabase database:
- On Vercel: **New Project → Import this repo → Root Directory: `automation`**. Vercel auto-detects
  the Python functions under `api/` from `requirements.txt` at the project root.
- Set the project's env vars from `.env.example` below, then deploy.

## Why cron, not a long-running worker

Same reasoning as the backend's PDF summary queue: this runs on Vercel, so nothing can keep
running after a request/cron invocation ends. `GET/POST /api/cron` processes one bounded batch
(3 users x 5 emails per tick, see `MAX_USERS_PER_TICK`/`MAX_EMAILS_PER_USER` in `api/cron.py`) and
returns. **Vercel's Hobby plan only runs cron jobs once a day** - `vercel.json`'s schedule is set
to `0 0 * * *` as a safe default. On Pro, change it to something like `*/5 * * * *`. Either way you
can always trigger a tick manually (see Testing below) - handy while a user's inbox is active.

## Setup

1. `cd automation && pip install -r requirements.txt` (use a virtualenv).
2. Apply `backend/sql/004_automation.sql` if you haven't already (adds the `integrations` and
   `telegram_link_codes` tables this service needs) - run it the same way you run the other
   migrations, e.g. `cd backend && npm run migrate`.
3. `cp .env.example .env` and fill it in:
   - `DATABASE_URL` / `JWT_SECRET`: copy from `backend/.env` exactly.
   - Google Cloud Console: create an OAuth client (type **Web application**), enable the **Gmail
     API**, add `GOOGLE_REDIRECT_URI` as an authorized redirect URI.
   - Telegram: message `@BotFather`, `/newbot`, copy the token into `TELEGRAM_BOT_TOKEN`.
   - `CRON_SECRET`: `python -c "import secrets; print(secrets.token_urlsafe(24))"`.
4. Set the Telegram bot's webhook to this service once deployed:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-deployment>.vercel.app/api/telegram_webhook"
   ```
5. Deploy to Vercel (see above), setting the same env vars there.

## Connecting a user's Gmail and Telegram

Nothing in the frontend calls these yet - wire these two links in behind buttons in Settings
whenever you're ready:
- **Gmail**: send the user to `GET /api/gmail_oauth_start?userId=<their user id>`. Google redirects
  back to `/api/gmail_oauth_callback`, which stores a refresh token in `integrations`.
- **Telegram**: generate a short code, insert it into `telegram_link_codes` (`code`, `user_id`,
  `expires_at`), show it in the dashboard, and tell the user to send `/link <code>` to your bot.
  The webhook links their `chat_id` to their account and deletes the code.

## Endpoints

| Method and path | Auth | Notes |
|---|---|---|
| `GET/POST /api/cron` | `Authorization: Bearer <CRON_SECRET>` | Runs one batch: fetch new Gmail messages per connected user, classify + draft/extract via the LangGraph pipeline, upsert into `email_activity`/`candidates`, create Gmail drafts, notify Telegram on urgent mail |
| `GET /api/gmail_oauth_start?userId=` | none | Redirects to Google's consent screen |
| `GET /api/gmail_oauth_callback` | none (Google's `state` param carries the user id) | Exchanges the code for a refresh token, stores it |
| `POST /api/telegram_webhook` | none (set as the bot's webhook) | Handles `/link <code>` messages |
| `GET /api/export` | `Authorization: Bearer <JWT>` (the dashboard's own login token) | Downloads an `.xlsx` report of the user's emails and candidates, built on the fly with `openpyxl` - nothing is stored |

## Testing a tick manually

```bash
curl -X POST https://<your-deployment>.vercel.app/api/cron \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## What the LangGraph pipeline does (`app/graph.py`)

```
classify  -->  (pipeline == hr?)      -->  extract_cv   -->  persist
   |      -->  (reply_needed?)        -->  draft_reply  -->  persist
   |      -->  otherwise              -->  persist
```

`classify` always runs first (priority, category, pipeline, reply_needed, summary). Persisting to
Postgres, creating the Gmail draft, and sending the Telegram alert all happen in `api/cron.py`
after the graph returns - the graph itself only produces the LLM outputs.

## Known limits (said plainly)

- No retry/backoff on Gemini or Gmail API errors beyond what's already in `gmail_client.py`'s
  draft creation try/except - a failed draft just logs and moves on to the next email.
- Gmail's History API cursor (`gmail_history_id`) can go stale after ~7 days of no activity; if
  that happens Google returns a 404 and the simplest fix is clearing that column so the next tick
  falls back to listing recent inbox messages again.
- `/api/export` reads directly from Postgres on every call - fine at this scale, not meant for a
  huge inbox history.
