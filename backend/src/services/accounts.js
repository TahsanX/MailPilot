import { query, withTransaction } from "../db.js";
import { hashPassword } from "./password.js";
import { signToken } from "./token.js";
import { summarisePdf } from "./gemini.js";
import { notifyMake } from "./make.js";
import { conflict } from "../utils/errors.js";

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, gmailConnected: u.gmail_connected, createdAt: u.created_at });

/** Loads the signup answers in the same shape the frontend onboarding uses. */
export async function getProfile(userId) {
  const [role, details, files] = await Promise.all([
    query("select * from job_roles where user_id = $1", [userId]),
    query("select * from details where user_id = $1", [userId]),
    query(
      `select id, original_name, size_bytes, summary, summary_status, summary_error, summarized_at
         from detail_files where user_id = $1 order by created_at`,
      [userId],
    ),
  ]);
  const r = role.rows[0];
  const d = details.rows[0];
  if (!r || !d) return null;

  return {
    profession: r.profession,
    departments: r.departments,
    neither: r.profession === "private_service_holder" && r.departments.length === 0,
    knowledgeBase: {
      companyName: d.company_name,
      companyOverview: d.company_overview,
      faqs: d.faqs,
      documents: files.rows.map((f) => ({
        id: f.id,
        name: f.original_name,
        size: f.size_bytes,
        summaryStatus: f.summary_status,
        summary: f.summary,
        summaryError: f.summary_error,
        summarizedAt: f.summarized_at,
      })),
    },
    hrPreferences: { enabled: r.hr_enabled, targetRole: r.hr_target_role, jobDescription: r.hr_job_description },
    customerCarePreferences: { enabled: r.care_enabled, serviceContext: r.care_service_context, responseTone: r.care_response_tone },
  };
}

/**
 * Creates the user, job role, details and file rows in one transaction. The signup response
 * does not wait for PDF summaries or the Make notification: on a serverless deployment nothing
 * can keep running after the response is sent, so that work is left for the cron job below
 * (POST/GET /api/cron/process-pending) to pick up. The PDF bytes are kept in detail_files.file_data
 * only until that job summarizes them.
 */
export async function createAccount({ account, profile, files }) {
  const passwordHash = await hashPassword(account.password);

  let user;
  try {
    user = await withTransaction(async (c) => {
      const u = (
        await c.query(
          `insert into users (name, email, password_hash) values ($1, $2, $3)
           returning id, name, email, token_version, gmail_connected, created_at`,
          [account.name, account.email, passwordHash],
        )
      ).rows[0];

      await c.query(
        `insert into job_roles (user_id, profession, departments, hr_target_role, hr_job_description, care_service_context, care_response_tone)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          u.id,
          profile.profession,
          profile.departments,
          profile.hrPreferences.targetRole,
          profile.hrPreferences.jobDescription,
          profile.customerCarePreferences.serviceContext,
          profile.customerCarePreferences.responseTone,
        ],
      );

      const detail = (
        await c.query(
          `insert into details (user_id, company_name, company_overview, faqs) values ($1, $2, $3, $4::jsonb) returning id`,
          [u.id, profile.knowledgeBase.companyName, profile.knowledgeBase.companyOverview, JSON.stringify(profile.knowledgeBase.faqs)],
        )
      ).rows[0];

      for (const f of files) {
        await c.query(
          `insert into detail_files (detail_id, user_id, original_name, mime_type, size_bytes, file_data)
           values ($1, $2, $3, 'application/pdf', $4, $5)`,
          [detail.id, u.id, f.originalname.slice(0, 255), f.size, f.buffer],
        );
      }
      return u;
    });
  } catch (err) {
    if (err.code === "23505") {
      throw conflict("An account with this email already exists.", { email: "An account with this email already exists." });
    }
    throw err;
  }

  return { user, token: signToken(user) };
}

/**
 * Summarizes one batch of PDFs still in 'pending' (newest signups first... actually oldest first,
 * so nobody waits forever behind a backlog). A row stuck in 'processing' because its invocation
 * was cut off (timed out, crashed) is requeued rather than left stranded. `limit` bounds how much
 * work one cron tick takes on, so it fits inside the serverless function's time budget.
 */
export async function processPendingSummaries(limit = 5) {
  await query(
    `update detail_files set summary_status = 'pending'
      where summary_status = 'processing' and created_at < now() - interval '5 minutes'`,
  );

  const { rows } = await query(
    `select id, file_data from detail_files where summary_status = 'pending' order by created_at limit $1`,
    [limit],
  );

  for (const f of rows) {
    await query("update detail_files set summary_status = 'processing' where id = $1", [f.id]);
    try {
      const summary = await summarisePdf(f.file_data);
      await query(
        `update detail_files set summary = $2, summary_status = 'done', summary_error = null, summarized_at = now(), file_data = null
          where id = $1`,
        [f.id, summary],
      );
    } catch (err) {
      await query(
        "update detail_files set summary_status = 'failed', summary_error = $2, file_data = null where id = $1",
        [f.id, err.message],
      );
    }
  }
  return rows.length;
}

/**
 * Notifies Make for any signed-up user whose files have all finished summarizing (done or
 * failed) and who has not been notified yet. Covers signups with zero PDFs too, since those have
 * no files to wait on at all.
 */
export async function notifyReadyUsers(limit = 20) {
  const { rows } = await query(
    `select u.id, u.name from users u
      where u.onboarding_notified_at is null
        and not exists (
          select 1 from detail_files df where df.user_id = u.id and df.summary_status in ('pending', 'processing')
        )
      order by u.created_at
      limit $1`,
    [limit],
  );

  for (const u of rows) {
    const profile = await getProfile(u.id);
    await notifyMake("user.onboarded", {
      userId: u.id,
      name: u.name,
      profession: profile.profession,
      departments: profile.departments,
      pipelines: ["general", ...(profile.hrPreferences.enabled ? ["hr"] : []), ...(profile.customerCarePreferences.enabled ? ["customer_care"] : [])],
      knowledgeBase: {
        companyName: profile.knowledgeBase.companyName,
        companyOverview: profile.knowledgeBase.companyOverview,
        faqs: profile.knowledgeBase.faqs,
        documentSummaries: profile.knowledgeBase.documents.filter((d) => d.summaryStatus === "done").map((d) => ({ name: d.name, summary: d.summary })),
      },
      hrPreferences: profile.hrPreferences,
      customerCarePreferences: profile.customerCarePreferences,
    });
    await query("update users set onboarding_notified_at = now() where id = $1", [u.id]);
  }
  return rows.length;
}
