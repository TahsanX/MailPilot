// End to end test against a real in-memory PostgreSQL (PGlite). No Supabase account needed.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const DB_PORT = 54329;
let db, socket, server, base, pool;
const sentCodes = [];

before(async () => {
  db = await PGlite.create();
  socket = new PGLiteSocketServer({ db, port: DB_PORT, host: "127.0.0.1" });
  await socket.start();

  // Set to "" rather than deleted: dotenv (loaded when config.js is imported below) only fills in keys
  // that are not already present in process.env, so this keeps a real .env file's keys out of the test run.
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
    DATABASE_SSL: "false",
    DB_POOL_MAX: "1",
    JWT_SECRET: "test-secret-test-secret-test-secret-1234",
    BCRYPT_ROUNDS: "10",
    MAKE_INBOUND_API_KEY: "inbound-key-1234567890",
    CRON_SECRET: "cron-secret-1234567890",
    ALLOW_SAMPLE_DATA: "true",
    RESEND_API_KEY: "",
    GEMINI_API_KEY: "",
    MAKE_WEBHOOK_URL: "",
    MAKE_WEBHOOK_API_KEY: "",
  });

  const origWarn = console.warn;
  console.warn = (...args) => {
    const m = String(args[0]).match(/reset code for .*: (\d{6})/);
    if (m) sentCodes.push(m[1]);
    else origWarn(...args);
  };

  ({ pool } = await import("../src/db.js"));
  for (const file of ["001_schema.sql", "002_dashboard.sql", "003_cron_queue.sql"]) {
    const sql = readFileSync(new URL(`../sql/${file}`, import.meta.url), "utf8");
    await pool.query(sql);
    // Idempotent: applying twice must not fail.
    await pool.query(sql);
  }

  const { createApp } = await import("../src/app.js");
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await pool?.end();
  await socket?.stop();
  await db?.close();
});

const json = (method, path, body, token) =>
  fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

function signupForm({ name = "Rafi Ahmed", email = "rafi@example.com", password = "Passw0rd!x", profile, pdf = true } = {}) {
  const form = new FormData();
  form.set("name", name);
  form.set("email", email);
  form.set("password", password);
  form.set(
    "profile",
    JSON.stringify(
      profile ?? {
        profession: "private_service_holder",
        departments: ["hr", "customer_care"],
        neither: false,
        knowledgeBase: {
          companyName: "Acme Ltd",
          companyOverview: "We sell widgets.",
          faqs: [{ question: "Refunds?", answer: "Within 14 days." }, { question: "", answer: "" }],
        },
        hrPreferences: { targetRole: "Backend engineer", jobDescription: "" },
        customerCarePreferences: { serviceContext: "", responseTone: "friendly" },
      },
    ),
  );
  if (pdf) form.append("documents", new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"], { type: "application/pdf" }), "policy.pdf");
  return form;
}

const signup = (opts) => fetch(base + "/auth/signup", { method: "POST", body: signupForm(opts) }).then(async (r) => ({ status: r.status, body: await r.json() }));

const runCronTick = () =>
  fetch(base + "/cron/process-pending", { headers: { authorization: "Bearer cron-secret-1234567890" } }).then(async (r) => ({ status: r.status, body: await r.json() }));

describe("auth and profile", () => {
  let token, userId;

  test("signup rejects invalid answers with field errors", async () => {
    const res = await signup({ name: "x", email: "nope", password: "short", profile: { profession: "student", departments: ["hr"] } });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.fields.name && res.body.error.fields.email && res.body.error.fields.password);
    assert.ok(res.body.error.fields.departments);
  });

  test("private service holder needs a department choice, HR needs company data", async () => {
    const res = await signup({ name: "Nadia K", email: "nadia@example.com", profile: { profession: "private_service_holder", departments: ["hr"] } });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.fields["knowledgeBase.companyName"]);
    assert.ok(res.body.error.fields["hrPreferences.targetRole"]);
  });

  test("signup creates user, job role, details and file row, and returns a token", async () => {
    const res = await signup();
    assert.equal(res.status, 201, JSON.stringify(res.body));
    token = res.body.token;
    userId = res.body.user.id;
    assert.equal(res.body.user.name, "Rafi Ahmed");
    assert.equal(res.body.user.email, "rafi@example.com");
    assert.equal(res.body.user.gmailConnected, false);
    assert.equal(res.body.user.passwordHash, undefined);
    const p = res.body.profile;
    assert.deepEqual(p.departments, ["hr", "customer_care"]);
    assert.equal(p.hrPreferences.enabled, true);
    assert.equal(p.customerCarePreferences.enabled, true);
    assert.equal(p.knowledgeBase.faqs.length, 1, "empty FAQ row is dropped");
    assert.equal(p.knowledgeBase.documents.length, 1);
  });

  test("password is stored as a bcrypt hash", async () => {
    const { rows } = await pool.query("select password_hash from users where lower(email) = 'rafi@example.com'");
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
  });

  test("the same name can sign up twice, but the same email cannot", async () => {
    const a = await signup({ name: "Rafi Ahmed", email: "other@example.com", pdf: false });
    assert.equal(a.status, 201, JSON.stringify(a.body));

    const b = await signup({ name: "Someone Else", email: "RAFI@example.com", pdf: false });
    assert.equal(b.status, 409);
    assert.ok(b.body.error.fields.email);
  });

  test("a file that is not really a PDF is rejected", async () => {
    const form = signupForm({ name: "Fake Pdf", email: "fake@example.com", pdf: false });
    form.append("documents", new Blob(["<html>not a pdf</html>"], { type: "application/pdf" }), "x.pdf");
    const res = await fetch(base + "/auth/signup", { method: "POST", body: form });
    assert.equal(res.status, 400);
  });

  test("the summary is marked failed (not left pending) once the cron queue runs, since Gemini is not configured", async () => {
    const before = await json("GET", "/profile", null, token);
    assert.equal(before.body.profile.knowledgeBase.documents[0].summaryStatus, "pending", "nothing processes it until the cron tick runs");

    const tick = await runCronTick();
    assert.equal(tick.status, 200);
    assert.ok(tick.body.summarized >= 1);

    const res = await json("GET", "/profile", null, token);
    assert.equal(res.status, 200);
    assert.equal(res.body.profile.knowledgeBase.documents[0].summaryStatus, "failed");
  });

  test("login by email works regardless of case and returns the dashboard payload", async () => {
    const res = await json("POST", "/auth/login", { email: "RAFI@example.com", password: "Passw0rd!x" });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.profile.profession, "private_service_holder");
  });

  test("wrong password and unknown email give the same error", async () => {
    const a = await json("POST", "/auth/login", { email: "rafi@example.com", password: "wrong-password1" });
    const b = await json("POST", "/auth/login", { email: "nobody@example.com", password: "wrong-password1" });
    assert.equal(a.status, 401);
    assert.deepEqual(a.body, b.body);
  });

  test("protected routes need a valid token", async () => {
    assert.equal((await json("GET", "/auth/me")).status, 401);
    assert.equal((await json("GET", "/auth/me", null, "garbage")).status, 401);
    assert.equal((await json("GET", "/auth/me", null, token)).status, 200);
  });

  test("forgot password answers the same for unknown emails and sends nothing", async () => {
    const before = sentCodes.length;
    const res = await json("POST", "/auth/forgot-password", { email: "ghost@example.com" });
    assert.equal(res.status, 200);
    assert.equal(sentCodes.length, before);
  });

  test("reset flow: wrong code fails, right code changes the password and signs out old sessions", async () => {
    const res = await json("POST", "/auth/forgot-password", { email: "rafi@example.com" });
    assert.equal(res.status, 200);
    const code = sentCodes.at(-1);
    assert.match(code, /^\d{6}$/);

    const wrong = await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: code === "000000" ? "111111" : "000000", newPassword: "NewPassw0rd" });
    assert.equal(wrong.status, 400);

    const weak = await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: code, newPassword: "short" });
    assert.equal(weak.status, 400);

    const ok = await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: code, newPassword: "NewPassw0rd" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));

    assert.equal((await json("GET", "/auth/me", null, token)).status, 401, "old token is invalid");
    assert.equal((await json("POST", "/auth/login", { email: "rafi@example.com", password: "Passw0rd!x" })).status, 401);
    assert.equal((await json("POST", "/auth/login", { email: "rafi@example.com", password: "NewPassw0rd" })).status, 200);

    const reuse = await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: code, newPassword: "AnotherPassw0rd" });
    assert.equal(reuse.status, 400, "a code works only once");
  });

  test("a code is locked after too many wrong guesses", async () => {
    // Cooldown blocks an immediate second request, so expire the previous row first.
    await pool.query("update password_resets set created_at = now() - interval '5 minutes'");
    await json("POST", "/auth/forgot-password", { email: "rafi@example.com" });
    const code = sentCodes.at(-1);
    const bad = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: bad, newPassword: "NewPassw0rd2" });
    const res = await json("POST", "/auth/reset-password", { email: "rafi@example.com", otp: code, newPassword: "NewPassw0rd2" });
    assert.equal(res.status, 400, "correct code no longer works after 5 failed attempts");
  });

  test("final login with the latest password, used for the dashboard tests below", async () => {
    const res = await json("POST", "/auth/login", { email: "rafi@example.com", password: "NewPassw0rd" });
    assert.equal(res.status, 200);
    token = res.body.token;
    userId = res.body.user.id;
  });
});

describe("dashboard and sample data", () => {
  let token, userId;

  test("setup: log in the HR + Customer Care user from the signup tests", async () => {
    const res = await json("POST", "/auth/login", { email: "rafi@example.com", password: "NewPassw0rd" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    token = res.body.token;
    userId = res.body.user.id;
  });

  test("summary and activity are empty before any data is loaded", async () => {
    const summary = await json("GET", "/dashboard/summary", null, token);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.hasData, false);
    assert.equal(summary.body.kpis.totalReceived, 0);

    const activity = await json("GET", "/dashboard/activity", null, token);
    assert.equal(activity.status, 200);
    assert.deepEqual(activity.body, []);
  });

  test("loading sample data fills the summary, activity, candidates and care stats", async () => {
    const load = await json("POST", "/dashboard/sample-data", null, token);
    assert.equal(load.status, 201, JSON.stringify(load.body));
    assert.ok(load.body.emails > 0);
    assert.ok(load.body.candidates > 0);

    const summary = await json("GET", "/dashboard/summary?range=30d", null, token);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.isSample, true);
    assert.ok(summary.body.kpis.totalReceived > 0);
    const purposeTotal = summary.body.purpose.reduce((s, p) => s + p.count, 0);
    assert.equal(purposeTotal, summary.body.kpis.totalReceived);
    assert.equal(summary.body.trend.length, 30);

    const activity = await json("GET", "/dashboard/activity", null, token);
    assert.ok(activity.body.length > 0);
    assert.ok(activity.body.every((e) => e.isSample === true));

    const candidates = await json("GET", "/dashboard/candidates?range=all", null, token);
    assert.equal(candidates.status, 200);
    assert.ok(candidates.body.length > 0);

    const care = await json("GET", "/dashboard/care?range=all", null, token);
    assert.equal(care.status, 200);
    assert.ok(care.body.total >= 0);
  });

  test("candidates and care are forbidden when the pipeline is not enabled", async () => {
    const form = new FormData();
    form.set("name", "No Pipelines");
    form.set("email", "nopipe@example.com");
    form.set("password", "Passw0rd!x");
    form.set("profile", JSON.stringify({ profession: "freelancer", departments: [], neither: false, knowledgeBase: { companyName: "", companyOverview: "", faqs: [] }, hrPreferences: { targetRole: "", jobDescription: "" }, customerCarePreferences: { serviceContext: "", responseTone: "professional" } }));
    const res = await fetch(base + "/auth/signup", { method: "POST", body: form });
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));

    assert.equal((await json("GET", "/dashboard/candidates", null, body.token)).status, 403);
    assert.equal((await json("GET", "/dashboard/care", null, body.token)).status, 403);
  });

  test("marking an email handled updates its status", async () => {
    const activity = await json("GET", "/dashboard/activity", null, token);
    const openOne = activity.body.find((e) => e.status !== "handled");
    assert.ok(openOne, "expected at least one non-handled sample email");

    const mark = await json("POST", `/dashboard/emails/${openOne.emailId}/handled`, {}, token);
    assert.equal(mark.status, 200);
    assert.equal(mark.body.status, "handled");

    const missing = await json("POST", "/dashboard/emails/does-not-exist/handled", {}, token);
    assert.equal(missing.status, 404);
  });

  test("clearing sample data empties the dashboard again", async () => {
    const cleared = await json("DELETE", "/dashboard/sample-data", null, token);
    assert.equal(cleared.status, 200);
    const summary = await json("GET", "/dashboard/summary", null, token);
    assert.equal(summary.body.hasData, false);
  });

  test("Make can push real email and candidate data, which the dashboard then reflects", async () => {
    const headers = { "Content-Type": "application/json", "x-make-apikey": "inbound-key-1234567890" };
    const now = new Date().toISOString();

    const emailsRes = await fetch(base + "/webhooks/make/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        emails: [
          {
            emailId: "real-1",
            threadId: "thread-1",
            receivedAt: now,
            senderName: "Real Sender",
            senderEmail: "real@example.com",
            subject: "A real email from Make",
            priority: "urgent",
            category: "productive",
            pipeline: "general",
            summary: "Needs a reply.",
            actionRequired: true,
            replyNeeded: true,
            draftCreated: true,
            status: "draft_ready",
            automationOutcome: "completed",
          },
        ],
      }),
    });
    assert.equal(emailsRes.status, 200);
    assert.equal((await emailsRes.json()).saved, 1);

    const candRes = await fetch(base + "/webhooks/make/candidates", {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        candidates: [
          { emailId: "real-1", candidateName: "Real Candidate", role: "Engineer", experience: "", education: "", projects: "", recommendation: "", senderEmail: "real@example.com", cvFilename: "cv.pdf", receivedAt: now },
        ],
      }),
    });
    assert.equal(candRes.status, 200);
    assert.equal((await candRes.json()).saved, 1);

    const summary = await json("GET", "/dashboard/summary", null, token);
    assert.equal(summary.body.isSample, false);
    assert.equal(summary.body.kpis.totalReceived, 1);

    // Re-sending the same emailId updates the row instead of duplicating it.
    await fetch(base + "/webhooks/make/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId, emails: [{ emailId: "real-1", threadId: "thread-1", receivedAt: now, priority: "urgent", category: "productive", status: "handled", automationOutcome: "completed" }] }),
    });
    const after = await json("GET", "/dashboard/activity", null, token);
    assert.equal(after.body.length, 1);
    assert.equal(after.body[0].status, "handled");
  });
});

describe("make webhook auth", () => {
  test("rejects calls without the key and accepts calls with it", async () => {
    const { rows } = await pool.query("select id from users limit 1");
    const body = JSON.stringify({ userId: rows[0].id, service: "gmail", connected: true });
    const headers = { "Content-Type": "application/json" };

    assert.equal((await fetch(base + "/webhooks/make/connection", { method: "POST", headers, body })).status, 401);
    assert.equal((await fetch(base + "/webhooks/make/connection", { method: "POST", headers: { ...headers, "x-make-apikey": "wrong" }, body })).status, 401);
    const ok = await fetch(base + "/webhooks/make/connection", { method: "POST", headers: { ...headers, "x-make-apikey": "inbound-key-1234567890" }, body });
    assert.equal(ok.status, 200);

    const check = await pool.query("select gmail_connected from users where id = $1", [rows[0].id]);
    assert.equal(check.rows[0].gmail_connected, true);
  });
});

describe("cron queue", () => {
  test("rejects calls without the secret and accepts calls with it", async () => {
    assert.equal((await fetch(base + "/cron/process-pending")).status, 401);
    assert.equal((await fetch(base + "/cron/process-pending", { headers: { authorization: "Bearer wrong" } })).status, 401);
    const ok = await runCronTick();
    assert.equal(ok.status, 200);
    assert.equal(typeof ok.body.summarized, "number");
    assert.equal(typeof ok.body.notified, "number");
  });

  test("a signup with no PDFs is notified as soon as the queue runs, without waiting on any file", async () => {
    const res = await signup({ name: "No Files", email: "nofiles@example.com", pdf: false });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    const before = await pool.query("select onboarding_notified_at from users where id = $1", [res.body.user.id]);
    assert.equal(before.rows[0].onboarding_notified_at, null);

    const tick = await runCronTick();
    assert.ok(tick.body.notified >= 1);

    const after = await pool.query("select onboarding_notified_at from users where id = $1", [res.body.user.id]);
    assert.ok(after.rows[0].onboarding_notified_at, "notified_at is set after the queue runs");
  });

  test("a notified user is not notified again by a later tick", async () => {
    const { rows } = await pool.query("select onboarding_notified_at from users where email = 'nofiles@example.com'");
    const first = rows[0].onboarding_notified_at;

    await runCronTick();

    const { rows: after } = await pool.query("select onboarding_notified_at from users where email = 'nofiles@example.com'");
    assert.equal(after[0].onboarding_notified_at.getTime(), first.getTime());
  });

  test("the PDF's bytes are cleared from the queue once it is done or failed", async () => {
    const { rows } = await pool.query("select file_data from detail_files where summary_status = 'failed' limit 1");
    assert.equal(rows[0].file_data, null);
  });
});
