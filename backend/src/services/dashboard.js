import { query } from "../db.js";
import { AppError, notFound } from "../utils/errors.js";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const OVERDUE_AFTER_HOURS = 48;
const OPEN = ["unread", "pending", "draft_ready", "overdue"];
const RANGE_DAYS = { "7d": 7, "30d": 30, all: null };

const iso = (d) => (d ? new Date(d).toISOString() : null);

export function rowToEmail(r) {
  return {
    emailId: r.email_id,
    threadId: r.thread_id,
    receivedAt: iso(r.received_at),
    senderName: r.sender_name,
    senderEmail: r.sender_email,
    subject: r.subject,
    priority: r.priority,
    category: r.category,
    pipeline: r.pipeline,
    summary: r.summary,
    actionRequired: r.action_required,
    replyNeeded: r.reply_needed,
    draftCreated: r.draft_created,
    status: r.status,
    repliedAt: iso(r.replied_at),
    meetingCreated: r.meeting_created,
    cvProcessed: r.cv_processed,
    automationOutcome: r.automation_outcome,
    isSample: r.is_sample,
  };
}

function rowToCandidate(r) {
  return {
    emailId: r.email_id,
    candidateName: r.candidate_name,
    role: r.role,
    experience: r.experience,
    education: r.education,
    projects: r.projects,
    recommendation: r.recommendation,
    senderEmail: r.sender_email,
    cvFilename: r.cv_filename,
    receivedAt: iso(r.received_at),
    isSample: r.is_sample,
  };
}

/** Which pipelines this user enabled. General always runs. */
export async function getPipelines(userId) {
  const { rows } = await query("select departments from job_roles where user_id = $1", [userId]);
  const departments = rows[0]?.departments ?? [];
  return { departments, pipelines: ["general", ...departments], hr: departments.includes("hr"), care: departments.includes("customer_care") };
}

async function loadEmails(userId, pipelines) {
  const { rows } = await query("select * from email_activity where user_id = $1 and pipeline = any($2) order by received_at desc limit 5000", [userId, pipelines]);
  return rows.map(rowToEmail);
}

const inRange = (e, range, now) => {
  const days = RANGE_DAYS[range];
  return days == null || now - new Date(e.receivedAt).getTime() <= days * DAY;
};

const countBy = (list, keys, field) => keys.map((key) => ({ key, count: list.filter((e) => e[field] === key).length }));

function trackerState(e, now) {
  const age = (now - new Date(e.receivedAt).getTime()) / HOUR;
  if (e.status === "overdue" || age > OVERDUE_AFTER_HOURS) return "overdue";
  return e.status === "unread" ? "unread" : "pending";
}

export async function getSummary(userId, { range, tzOffset }) {
  const { pipelines } = await getPipelines(userId);
  const all = await loadEmails(userId, pipelines);
  const now = Date.now();
  const shift = tzOffset * 60_000;
  const emails = all.filter((e) => inRange(e, range, now));

  const completed = emails.filter((e) => e.automationOutcome === "completed");
  const attempts = emails.filter((e) => e.automationOutcome !== "not_started");
  const drafts = emails.filter((e) => e.draftCreated).length;
  const replyMinutes = emails
    .filter((e) => e.repliedAt)
    .map((e) => (new Date(e.repliedAt) - new Date(e.receivedAt)) / 60_000)
    .filter((m) => m >= 0);
  const unanswered = emails.filter((e) => e.replyNeeded && !e.repliedAt && !["handled", "delegated"].includes(e.status)).length;

  const senders = new Map();
  for (const e of emails) {
    const cur = senders.get(e.senderEmail) ?? { name: e.senderName, email: e.senderEmail, count: 0 };
    cur.count += 1;
    senders.set(e.senderEmail, cur);
  }

  // Hours and days are grouped in the user's local time.
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const e of emails) hours[new Date(new Date(e.receivedAt).getTime() - shift).getUTCHours()].count += 1;

  const trendDays = range === "7d" ? 7 : 30;
  const todayKey = Math.floor((now - shift) / DAY);
  const perDay = new Map();
  for (const e of all) {
    const k = Math.floor((new Date(e.receivedAt).getTime() - shift) / DAY);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
  }
  const trend = Array.from({ length: trendDays }, (_, i) => {
    const k = todayKey - (trendDays - 1 - i);
    return { date: new Date(k * DAY + shift).toISOString(), count: perDay.get(k) ?? 0 };
  });

  const urgent = all
    .filter((e) => e.priority === "urgent" && OPEN.includes(e.status))
    .map((e) => ({ ...e, trackerState: trackerState(e, now) }))
    .slice(0, 40);

  const urgentPending = emails.filter((e) => e.priority === "urgent" && OPEN.includes(e.status)).length;

  return {
    isSample: all.some((e) => e.isSample),
    hasData: all.length > 0,
    range,
    kpis: {
      totalReceived: emails.length,
      urgentPending,
      draftsPrepared: drafts,
      timeSavedMinutes: drafts * 4 + emails.length,
      handledAutomatically: completed.length,
      unanswered,
    },
    purpose: countBy(emails, ["promotional", "productive", "transactional", "personal", "other"], "category"),
    priority: countBy(emails, ["urgent", "medium", "low"], "priority"),
    trend,
    trendDays,
    response: {
      avgMinutes: replyMinutes.length ? replyMinutes.reduce((s, m) => s + m, 0) / replyMinutes.length : null,
      sampleSize: replyMinutes.length,
      unanswered,
    },
    topSenders: [...senders.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    hours,
    automation: {
      handled: completed.length,
      successCount: completed.length,
      attempts: attempts.length,
      handovers: emails.filter((e) => e.pipeline === "customer_care" && e.status === "delegated").length,
      cvsProcessed: emails.filter((e) => e.cvProcessed).length,
      cvsFailed: emails.filter((e) => e.pipeline === "hr" && !e.cvProcessed).length,
      meetings: emails.filter((e) => e.meetingCreated).length,
    },
    urgent,
  };
}

export async function getActivity(userId) {
  const { pipelines } = await getPipelines(userId);
  return loadEmails(userId, pipelines);
}

/** Marks an email handled. This never sends a reply; the user replies in Gmail. */
export async function markHandled(userId, emailId) {
  const { rowCount } = await query(
    "update email_activity set status = 'handled', handled_at = now() where user_id = $1 and email_id = $2",
    [userId, emailId],
  );
  if (!rowCount) throw notFound("Email not found.");
  return { emailId, status: "handled" };
}

export async function getCandidates(userId, { range }) {
  const { hr } = await getPipelines(userId);
  if (!hr) throw new AppError(403, "pipeline_disabled", "The HR pipeline is not enabled for this account.");
  const { rows } = await query("select * from candidates where user_id = $1 order by received_at desc limit 1000", [userId]);
  const now = Date.now();
  return rows.map(rowToCandidate).filter((c) => inRange(c, range, now));
}

export async function getCareStats(userId, { range }) {
  const { care } = await getPipelines(userId);
  if (!care) throw new AppError(403, "pipeline_disabled", "The Customer Care pipeline is not enabled for this account.");
  const { rows } = await query("select * from email_activity where user_id = $1 and pipeline = 'customer_care' order by received_at desc limit 2000", [userId]);
  const now = Date.now();
  const list = rows.map(rowToEmail).filter((e) => inRange(e, range, now));
  return {
    handovers: list.filter((e) => e.status === "delegated").length,
    resolvedAutomatically: list.filter((e) => e.automationOutcome === "completed").length,
    total: list.length,
    conversations: list.slice(0, 12),
  };
}

/* ------------------------------------------------------------- writes */

const EMAIL_COLUMNS = `
  email_id text, thread_id text, received_at timestamptz, sender_name text, sender_email text, subject text,
  priority text, category text, pipeline text, summary text, action_required boolean, reply_needed boolean,
  draft_created boolean, status text, replied_at timestamptz, meeting_created boolean, cv_processed boolean,
  automation_outcome text`;

const toEmailJson = (e) => ({
  email_id: e.emailId,
  thread_id: e.threadId,
  received_at: iso(e.receivedAt),
  sender_name: e.senderName,
  sender_email: e.senderEmail,
  subject: e.subject,
  priority: e.priority,
  category: e.category,
  pipeline: e.pipeline,
  summary: e.summary,
  action_required: e.actionRequired,
  reply_needed: e.replyNeeded,
  draft_created: e.draftCreated,
  status: e.status,
  replied_at: iso(e.repliedAt),
  meeting_created: e.meetingCreated,
  cv_processed: e.cvProcessed,
  automation_outcome: e.automationOutcome,
});

/** Inserts or updates emails by (user, email_id). One statement, so a batch is all or nothing. */
export async function upsertEmails(userId, emails, { isSample = false } = {}) {
  if (!emails.length) return 0;
  const { rowCount } = await query(
    `insert into email_activity (user_id, email_id, thread_id, received_at, sender_name, sender_email, subject, priority, category, pipeline,
       summary, action_required, reply_needed, draft_created, status, replied_at, meeting_created, cv_processed, automation_outcome, is_sample)
     select $1, x.email_id, x.thread_id, x.received_at, x.sender_name, x.sender_email, x.subject, x.priority, x.category, x.pipeline,
       x.summary, x.action_required, x.reply_needed, x.draft_created, x.status, x.replied_at, x.meeting_created, x.cv_processed, x.automation_outcome, $3
       from jsonb_to_recordset($2::jsonb) as x(${EMAIL_COLUMNS})
     on conflict (user_id, email_id) do update set
       thread_id = excluded.thread_id, received_at = excluded.received_at, sender_name = excluded.sender_name,
       sender_email = excluded.sender_email, subject = excluded.subject, priority = excluded.priority,
       category = excluded.category, pipeline = excluded.pipeline, summary = excluded.summary,
       action_required = excluded.action_required, reply_needed = excluded.reply_needed,
       draft_created = excluded.draft_created,
       -- A status the user set in the dashboard is not overwritten by a later automation update.
       status = case when email_activity.handled_at is not null then email_activity.status else excluded.status end,
       replied_at = excluded.replied_at, meeting_created = excluded.meeting_created,
       cv_processed = excluded.cv_processed, automation_outcome = excluded.automation_outcome, is_sample = excluded.is_sample`,
    [userId, JSON.stringify(emails.map(toEmailJson)), isSample],
  );
  return rowCount;
}

export async function upsertCandidates(userId, candidates, { isSample = false } = {}) {
  if (!candidates.length) return 0;
  const json = candidates.map((c) => ({
    email_id: c.emailId,
    candidate_name: c.candidateName,
    role: c.role,
    experience: c.experience,
    education: c.education,
    projects: c.projects,
    recommendation: c.recommendation,
    sender_email: c.senderEmail,
    cv_filename: c.cvFilename,
    received_at: iso(c.receivedAt),
  }));
  const { rowCount } = await query(
    `insert into candidates (user_id, email_id, candidate_name, role, experience, education, projects, recommendation, sender_email, cv_filename, received_at, is_sample)
     select $1, x.email_id, x.candidate_name, x.role, x.experience, x.education, x.projects, x.recommendation, x.sender_email, x.cv_filename, x.received_at, $3
       from jsonb_to_recordset($2::jsonb) as x(email_id text, candidate_name text, role text, experience text, education text,
         projects text, recommendation text, sender_email text, cv_filename text, received_at timestamptz)
     on conflict (user_id, email_id) do update set
       candidate_name = excluded.candidate_name, role = excluded.role, experience = excluded.experience,
       education = excluded.education, projects = excluded.projects, recommendation = excluded.recommendation,
       sender_email = excluded.sender_email, cv_filename = excluded.cv_filename, received_at = excluded.received_at,
       is_sample = excluded.is_sample`,
    [userId, JSON.stringify(json), isSample],
  );
  return rowCount;
}

export async function clearSampleData(userId) {
  await query("delete from candidates where user_id = $1 and is_sample", [userId]);
  await query("delete from email_activity where user_id = $1 and is_sample", [userId]);
}
