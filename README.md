# MailPilot

AI email assistant. Reads Gmail, classifies and drafts replies, tracks HR/Customer Care
pipelines, and shows everything in a dashboard. Three independent projects, one Supabase
database:

| Folder | What it is | Runtime |
|---|---|---|
| [`frontend/`](frontend) | React + Vite dashboard and onboarding | Node (static build) |
| [`backend/`](backend) | Auth, dashboard data, PDF summaries, cron queue | Node/Express |
| [`automation/`](automation) | Gmail/Telegram/Excel automation (LangGraph + LangChain + Gemini) | Python/Flask |

Each has its own `README.md` with setup, env vars and deployment notes. All three read/write the
same Supabase Postgres database (`backend/sql/*.sql` holds every migration, applied once from
`backend/`).

## Deploying

All three deploy from this one GitHub repo as **three separate Vercel projects** under the same
Vercel account - that's expected and the right setup, not a workaround:

1. **New Project → Import this repo**, three times, each with a different **Root Directory**:
   `frontend`, `backend`, `automation`.
2. Set each project's own env vars (see that folder's `.env.example`) in Vercel's dashboard -
   `.env` files are never read in production.
3. `backend` and `automation` both need the same Supabase `DATABASE_URL` (the connection pooler
   URI, not the direct host - see `backend/README.md`).
4. `frontend`'s `VITE_API_URL` points at the deployed `backend` URL, and `VITE_AUTOMATION_URL`
   at the deployed `automation` URL.

They can't be merged into one Vercel project: `backend` is a long-lived-style Node/Express app
served through a single serverless function, `automation` is a set of independent Python
functions, and `frontend` is a static build - different builders, different runtimes.
