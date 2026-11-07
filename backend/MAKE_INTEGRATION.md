# MailPilot ↔ Make.com ↔ Supabase integration guide

This file is written so you can paste it into ChatGPT/GPT along with "help me build this Make.com scenario" and get working step-by-step instructions. It describes every endpoint your backend exposes, the exact JSON shape each one needs, and what tables they touch in Supabase. You never need to touch Supabase directly from Make — **Make only ever talks to the MailPilot backend API over HTTP**. The backend is the only thing that touches the Postgres database.

```
Gmail  --->  Make.com scenario  --->  MailPilot backend API  --->  Supabase (Postgres)
                                            ^
                                            |
                                    Gemini (PDF summaries, inside backend only)
```

Make never needs a Supabase connector, a database password, or direct SQL access. It only needs:
1. Your backend's base URL (while testing: `http://localhost:4000/api`; once deployed, your real HTTPS URL).
2. One shared secret key (`MAKE_INBOUND_API_KEY`) to authenticate its calls into the backend.
3. The `userId` of the MailPilot account it is acting on behalf of (you get this once, from the connection step below).

---

## 1. The three pieces of config you need before touching Make

Open `backend/.env` and look at (or set) these three values:

| Variable | What it is | Example |
|---|---|---|
| `MAKE_WEBHOOK_URL` | A webhook URL **Make gives you** (see §4) that the backend calls right after someone finishes signup | `https://hook.us1.make.com/abc123...` |
| `MAKE_WEBHOOK_API_KEY` | A secret **you make up**, sent by the backend to Make in the `x-make-apikey` header when calling the URL above | any random string, e.g. `mp_out_7f3a...` |
| `MAKE_INBOUND_API_KEY` | A secret **you make up**, sent by Make to the backend in the `x-make-apikey` header on every call Make makes *into* the backend | any random string, e.g. `mp_in_9c21...` |

Generate random secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

You will paste `MAKE_INBOUND_API_KEY` into every Make HTTP module as a header. You will paste `MAKE_WEBHOOK_API_KEY` into Make's "Custom webhook" trigger module as its authentication key.

---

## 2. Supabase tables Make's data ends up in

You never write SQL for this and you never call Supabase directly — the backend does all of it. This table is here so you (or GPT) understand *what the backend stores* when Make sends data, which helps you map Gmail/Gemini fields to the right JSON keys.

### `email_activity` — one row per processed email
| Column | Type | Allowed values / notes |
|---|---|---|
| `email_id` | text | Gmail message id. Unique per user — sending the same one again **updates** that row instead of duplicating |
| `thread_id` | text | Gmail thread id |
| `received_at` | timestamp | ISO 8601, e.g. `2026-11-07T09:30:00Z` |
| `sender_name`, `sender_email`, `subject` | text | free text |
| `priority` | text | `urgent` \| `medium` \| `low` |
| `category` | text | `promotional` \| `productive` \| `transactional` \| `personal` \| `other` |
| `pipeline` | text | `general` \| `hr` \| `customer_care` |
| `summary` | text | one or two line AI summary of the email |
| `action_required`, `reply_needed`, `draft_created`, `meeting_created`, `cv_processed` | boolean | flags Make sets after it acts |
| `status` | text | `unread` \| `draft_ready` \| `pending` \| `handled` \| `overdue` \| `delegated` |
| `automation_outcome` | text | `not_started` \| `completed` \| `failed` \| `needs_human` |

### `candidates` — one row per CV, only for the HR pipeline
| Column | Type | Notes |
|---|---|---|
| `email_id` | text | same Gmail message id as the email that had the CV attached |
| `candidate_name`, `role`, `experience`, `education`, `projects`, `recommendation` | text | pulled from the CV by your AI step in Make (e.g. Gemini/OpenAI module). Leave `""` if unknown — never guess |
| `sender_email`, `cv_filename` | text | |
| `received_at` | timestamp | ISO 8601 |

### `users.gmail_connected`
A single boolean flipped to `true` once Make confirms the Gmail module authorized correctly.

---

## 3. Every endpoint Make will call (or receive a call from)

Base URL while testing locally: `http://localhost:4000/api`. Replace with your real server URL once deployed (e.g. Render/Railway/Fly — anything that can run `node src/server.js` and reach your Supabase pooler).

All inbound-to-backend calls need this header:
```
x-make-apikey: <value of MAKE_INBOUND_API_KEY>
Content-Type: application/json
```

### 3.1 `POST /api/webhooks/make/connection` — mark Gmail as connected
Call this once, right after the user authorizes the Gmail module in your Make scenario.

Request body:
```json
{
  "userId": "11111111-2222-3333-4444-555555555555",
  "service": "gmail",
  "connected": true
}
```
Response: `{ "ok": true }`

### 3.2 `POST /api/webhooks/make/emails` — send processed emails (up to 200 per call)
Call this every time your Make scenario finishes classifying/acting on a batch of emails (e.g. once per Gmail trigger run).

Request body:
```json
{
  "userId": "11111111-2222-3333-4444-555555555555",
  "emails": [
    {
      "emailId": "19234abc8f0e1a2b",
      "threadId": "19234abc8f0e1a2b",
      "receivedAt": "2026-11-07T09:30:00Z",
      "senderName": "Amelia Hart",
      "senderEmail": "amelia@example.com",
      "subject": "Contract revision for review",
      "priority": "urgent",
      "category": "productive",
      "pipeline": "general",
      "summary": "Asks for the revised contract to be signed by Friday.",
      "actionRequired": true,
      "replyNeeded": true,
      "draftCreated": true,
      "status": "draft_ready",
      "repliedAt": null,
      "meetingCreated": false,
      "cvProcessed": false,
      "automationOutcome": "completed"
    }
  ]
}
```
Only `emailId`, `threadId`, `receivedAt`, `priority` and `category` are required — everything else has a safe default if your Make scenario doesn't have that information yet. Response: `{ "ok": true, "saved": 1 }`.

### 3.3 `POST /api/webhooks/make/candidates` — send parsed CVs (HR pipeline only)
```json
{
  "userId": "11111111-2222-3333-4444-555555555555",
  "candidates": [
    {
      "emailId": "19234abc8f0e1a2b",
      "candidateName": "Daniel Okafor",
      "role": "Backend Engineer",
      "experience": "4 years, Node.js and PostgreSQL",
      "education": "BSc Computer Science",
      "projects": "Built a payments microservice handling 10k req/min",
      "recommendation": "Strong fit for the backend role",
      "senderEmail": "daniel@example.com",
      "cvFilename": "daniel_okafor_cv.pdf",
      "receivedAt": "2026-11-07T10:05:00Z"
    }
  ]
}
```
Response: `{ "ok": true, "saved": 1 }`.

### 3.4 `POST /api/auth/signup` — where `userId` comes from (outbound, backend → Make)
You don't call this. The **frontend** calls it when a user finishes onboarding. Right after that, the backend calls **your** Make webhook URL (`MAKE_WEBHOOK_URL`) once, so your scenario learns the new `userId` and that user's preferences:

```json
{
  "event": "user.onboarded",
  "sentAt": "2026-11-07T09:00:00Z",
  "data": {
    "userId": "11111111-2222-3333-4444-555555555555",
    "name": "Tahsan Zahid",
    "profession": "private_service_holder",
    "departments": ["hr", "customer_care"],
    "pipelines": ["general", "hr", "customer_care"],
    "knowledgeBase": {
      "companyName": "Acme Corp",
      "companyOverview": "We build widgets.",
      "faqs": [{ "question": "What are your hours?", "answer": "9 to 5, Mon-Fri." }],
      "documentSummaries": [{ "name": "employee_handbook.pdf", "summary": "Covers leave policy, benefits, and code of conduct." }]
    },
    "hrPreferences": { "enabled": true, "targetRole": "Backend Engineer", "jobDescription": "..." },
    "customerCarePreferences": { "enabled": true, "serviceContext": "...", "responseTone": "professional" }
  }
}
```
This never includes the password, email address, or raw PDF bytes — only what Make needs to decide which pipeline(s) to run and with what context. **This is the payload your "Custom webhook" trigger module in Make will receive** — see §4.

### 3.5 Read-only endpoints (optional — useful for testing only, require a real user JWT not the Make key)
These are for your own debugging in a browser, not for Make:
- `GET /api/dashboard/summary?range=30d` — KPIs
- `GET /api/dashboard/activity` — all processed emails
- `GET /api/dashboard/candidates` — all candidates
- `GET /api/health` — `{ "ok": true }`, no auth, use this to confirm the server is reachable from Make at all

---

## 4. Step-by-step: building the Make.com scenario (for a first-timer)

You will build **one scenario with two trigger paths**: a webhook trigger (fires once per new MailPilot signup) and a Gmail trigger (fires on every new email). Simplest to start: build two *separate* scenarios.

### Scenario A — "New MailPilot user" (receives the `user.onboarded` event)

1. In Make, click **Create a new scenario**.
2. Add a module: search **Webhooks** → **Custom webhook**. Click **Add**, name it `MailPilot user onboarded`.
3. Make shows you a webhook URL like `https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxx`. **Copy it.**
4. Paste that URL into `backend/.env` as:
   ```
   MAKE_WEBHOOK_URL=https://hook.us1.make.com/xxxxxxxxxxxxxxxxxxxxx
   ```
5. Still in the webhook module, click **Show advanced settings** → under **Webhook security**, choose a way to require the `x-make-apikey` header (Make calls this a "header" filter/validation, depending on your Make plan — if your plan doesn't support header auth on the trigger, add a **Filter** right after this module instead: `Header x-make-apikey` **Equal to** the value of `MAKE_WEBHOOK_API_KEY` you put in `.env`).
6. Click **Run once** on the webhook module, then trigger a real signup from the MailPilot frontend (or send a test curl matching §3.4's JSON) so Make captures a sample payload and learns the field structure.
7. Now add whatever modules you want after it — e.g. a **Router** that branches on `pipelines` containing `hr` vs `customer_care` vs just `general`, so you can set up different Gmail label rules per pipeline. Store `data.userId` somewhere you can reuse (a Make **Data store**, or a Google Sheet row keyed by email) — you'll need it in Scenario B.
8. Turn the scenario **ON** (top-left toggle).

### Scenario B — "Process incoming Gmail" (the real automation)

1. **Create a new scenario.**
2. Add module: **Gmail** → **Watch emails**. Connect your Google account (OAuth popup). Choose the folder/label to watch (e.g. `INBOX`).
3. Add module: an AI step to classify the email — easiest is **HTTP → Make a request** to Gemini, or use Make's built-in **OpenAI/Gemini** app module if available on your plan. Prompt it to return JSON with `priority`, `category`, `summary`, etc. matching the field names in §3.2.
4. Add module: **HTTP → Make a request** — this calls your backend to confirm Gmail is connected (do this once, you can delete this module after the first successful run, or guard it with a filter so it only runs once):
   - URL: `http://localhost:4000/api/webhooks/make/connection` (or your deployed URL)
   - Method: `POST`
   - Headers: `x-make-apikey: <MAKE_INBOUND_API_KEY>`, `Content-Type: application/json`
   - Body type: `Raw` / `JSON`
   - Body:
     ```json
     { "userId": "{{ the userId you stored from Scenario A }}", "service": "gmail", "connected": true }
     ```
5. Add module: **HTTP → Make a request** — send the processed email to the backend:
   - URL: `http://localhost:4000/api/webhooks/make/emails`
   - Method: `POST`
   - Headers: `x-make-apikey: <MAKE_INBOUND_API_KEY>`, `Content-Type: application/json`
   - Body (map each field from the Gmail module / your AI step's output into this shape):
     ```json
     {
       "userId": "{{ stored userId }}",
       "emails": [
         {
           "emailId": "{{Gmail: Message ID}}",
           "threadId": "{{Gmail: Thread ID}}",
           "receivedAt": "{{Gmail: Date}}",
           "senderName": "{{Gmail: From Name}}",
           "senderEmail": "{{Gmail: From Email}}",
           "subject": "{{Gmail: Subject}}",
           "priority": "{{AI step: priority}}",
           "category": "{{AI step: category}}",
           "pipeline": "{{AI step: pipeline}}",
           "summary": "{{AI step: summary}}",
           "actionRequired": true,
           "replyNeeded": true,
           "draftCreated": false,
           "status": "pending",
           "automationOutcome": "completed"
         }
       ]
     }
     ```
6. If `pipeline` is `hr` and a CV/resume attachment is present, add a **Router** branch that:
   - Downloads the attachment (Gmail module: **Get an attachment**).
   - Sends it to an AI module to extract fields.
   - Calls `POST /api/webhooks/make/candidates` the same way as step 5, with the shape from §3.3.
7. If the AI step decided `replyNeeded: true`, add a **Gmail → Create a draft** module so the draft actually appears in the user's Gmail (the backend only stores that a draft exists — it never sends mail itself).
8. If the email confirms a meeting time, add a **Google Calendar → Create an event** module, then set `meetingCreated: true` in the email payload.
9. Turn the scenario **ON**.

### Testing without Gmail
You can test steps 4–5 directly with `curl` before wiring up Gmail at all:
```bash
curl -X POST http://localhost:4000/api/webhooks/make/emails \
  -H "x-make-apikey: YOUR_MAKE_INBOUND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"PASTE_A_REAL_USER_ID","emails":[{"emailId":"test-1","threadId":"test-1","receivedAt":"2026-11-07T09:00:00Z","priority":"urgent","category":"productive"}]}'
```
Get a real `userId` by signing up once in the frontend, then checking the response, or by running:
```bash
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer YOUR_JWT"
```
(the JWT is what the frontend stored in `localStorage` under `mailpilot.token` after you logged in).

---

## 5. Common mistakes to avoid

- **Don't give Make a Supabase/database password.** It never needs one — it only ever calls your backend's HTTP endpoints.
- **The `x-make-apikey` header is required on every inbound call** (`/make/connection`, `/make/emails`, `/make/candidates`). Forgetting it returns `401 unauthorized`.
- **`userId` must be a real UUID that exists in your `users` table**, otherwise you get `404 user not found`. Get it once from the `user.onboarded` webhook (§3.4) and store it in a Make data store keyed by the user's email, so later Gmail runs can look it up.
- **Resending the same `emailId` updates that row, it does not duplicate it** — so it's safe to re-run a Make scenario on the same email while you're testing.
- **If a user has already marked an email "handled" in the dashboard, a later Make update for that `emailId` will not silently flip its status back** — this is intentional, don't fight it.
- `ALLOW_SAMPLE_DATA=true` in `.env` lets you click "Load sample data" in the dashboard to see what a populated dashboard looks like before Make sends anything real. Turn it off (`false`) in production.
