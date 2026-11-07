# MailPilot backend

Express API with PostgreSQL (Supabase), Zod validation, JWT and bcrypt auth, Resend password reset codes, Gemini PDF summaries and Make.com webhooks.

## Setup

1. Create a Supabase project. Project settings > Database > Connection Pooling, copy the **port 6543 (transaction mode)** connection string. The direct `db.*.supabase.co:5432` host is IPv6 only and will fail to connect from many networks.
2. `cp .env.example .env` and fill it in. `JWT_SECRET` must be 32+ random characters (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
3. Create the tables: `npm install`, then `npm run migrate`. This applies every file in `sql/` in order; each one is safe to re-run.
4. `npm run dev` (port 4000).
5. `npm test` runs 22 end to end tests against an in-memory PostgreSQL. No Supabase account needed, and it never touches the real database.

Without `RESEND_API_KEY` the reset code is printed to the console (development only). Without `GEMINI_API_KEY` uploaded PDFs are marked `failed`. Without `MAKE_WEBHOOK_URL` Make is not notified.

## Schema (`sql/001_schema.sql`, `sql/002_dashboard.sql`)

| Table | Purpose |
|---|---|
| `users` | name, email (unique, case insensitive), bcrypt hash, `token_version`, `gmail_connected` |
| `job_roles` | profession, departments, HR target role and description, Customer Care context and tone |
| `details` | company name, overview, FAQs (jsonb) |
| `detail_files` | one row per uploaded PDF with its Gemini summary and status. The PDF itself is not stored |
| `password_resets` | hashed one time codes with expiry and attempt count |
| `email_activity` | one row per processed email: priority, category, pipeline, draft/meeting flags, status. Written by Make or by the sample data loader |
| `candidates` | CV fields read from HR emails. Missing fields stay as empty strings |

Row level security is enabled on every table with no policies, so the public Supabase Data API cannot read them. The API connects with the database owner role.

## Endpoints

| Method and path | Auth | Notes |
|---|---|---|
| `POST /api/auth/signup` | none | `multipart/form-data`: `name`, `email`, `password`, `profile` (JSON string, same shape as the frontend onboarding config), `documents` (0 to 5 PDFs, 10 MB each). Returns `{ token, user, profile }` |
| `POST /api/auth/login` | none | `{ email, password }`. Returns `{ token, user, profile }`, enough to open the dashboard directly |
| `GET /api/auth/me` | Bearer | Current user and profile |
| `GET /api/profile` | Bearer | Same data. Poll it to follow each file's `summaryStatus` (`pending`, `processing`, `done`, `failed`) |
| `POST /api/auth/forgot-password` | none | `{ email }`. Always answers 200. Emails a 6 digit code valid for 10 minutes |
| `POST /api/auth/reset-password` | none | `{ email, otp, newPassword }`. Code works once, 5 attempts, and signs out all old sessions |
| `GET /api/dashboard/summary?range=7d\|30d\|all&tzOffset=` | Bearer | KPIs, purpose/priority breakdown, trend, top senders, busiest hours, automation stats, urgent tracker |
| `GET /api/dashboard/activity` | Bearer | Every processed email for the user's enabled pipelines |
| `POST /api/dashboard/emails/:emailId/handled` | Bearer | Marks one email handled. Never sends a reply |
| `GET /api/dashboard/candidates?range=` | Bearer | 403 if the HR pipeline is not enabled |
| `GET /api/dashboard/care?range=` | Bearer | 403 if the Customer Care pipeline is not enabled |
| `POST /api/dashboard/sample-data` | Bearer | Fills the dashboard with clearly marked sample data, for previewing before Make is connected. 403 when `ALLOW_SAMPLE_DATA=false` |
| `DELETE /api/dashboard/sample-data` | Bearer | Removes sample rows. Always available |
| `POST /api/webhooks/make/connection` | `x-make-apikey` | `{ userId, service: "gmail", connected }`. Sets `gmail_connected` |
| `POST /api/webhooks/make/emails` | `x-make-apikey` | `{ userId, emails: [...] }`, up to 200. Upserts by `emailId`; real data overwrites sample data |
| `POST /api/webhooks/make/candidates` | `x-make-apikey` | `{ userId, candidates: [...] }`, up to 200 |
| `GET /api/health` | none | |

Errors always look like `{ "error": { "code", "message", "fields?" } }`. `fields` maps a path such as `knowledgeBase.companyName` to a message, so the frontend can show it beside the input.

## Make.com

- **Outbound:** after signup and once every PDF summary has finished or failed, the API posts `{ event: "user.onboarded", sentAt, data }` to `MAKE_WEBHOOK_URL` with header `x-make-apikey`. `data` has `userId`, `profession`, `pipelines` (`general`, plus `hr` and `customer_care` when enabled), the knowledge base text, document summaries and preferences. It never includes the password, email address or PDF bytes.
- **Inbound:**
  - When the Gmail module in Make is authorised, call `POST /api/webhooks/make/connection` with `x-make-apikey: <MAKE_INBOUND_API_KEY>`. Until then the dashboard shows Gmail as not connected.
  - As Make classifies and acts on mail, call `POST /api/webhooks/make/emails` (and `/make/candidates` for CVs) with the same header to fill the dashboard. Re-sending the same `emailId` updates that row instead of duplicating it, and once a user marks an email handled in the dashboard a later Make update will not silently flip its status back.

## Decisions to know about

- **Login uses email, not name.** Names do not need to be unique.
- **Summaries run after the signup response.** Signup returns in about a second. If the server restarts mid summary, the file is marked `failed` on next start rather than staying pending forever.
- **Onboarding answers and PDFs are accepted only at signup.** There is no edit endpoint yet; Settings in the frontend is read only for that data.
- **PDFs are checked by their `%PDF-` header**, not just the client's content type.
- **Sample data is per user and clearly flagged** (`is_sample`, and `isSample`/`sampleDataAllowed` in the summary response), so Make-provided rows and preview rows are never confused.
