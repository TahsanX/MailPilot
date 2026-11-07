import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { query } from "../db.js";
import { webhookLimiter } from "../middleware/rateLimit.js";
import { parse } from "../middleware/validate.js";
import { makeConnectionSchema } from "../schemas/auth.js";
import { ingestCandidatesSchema, ingestEmailsSchema } from "../schemas/dashboard.js";
import { getProfile } from "../services/accounts.js";
import { upsertCandidates, upsertEmails } from "../services/dashboard.js";
import { AppError, notFound } from "../utils/errors.js";

const userIdParamSchema = z.object({ userId: z.uuid() });

export const webhookRouter = Router();

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Inbound calls from Make.com must carry the shared key in the x-make-apikey header. */
function requireMakeKey(req, _res, next) {
  if (!config.MAKE_INBOUND_API_KEY) throw new AppError(503, "webhook_disabled", "Inbound Make webhooks are not configured.");
  const key = req.get("x-make-apikey") ?? "";
  if (!safeEqual(key, config.MAKE_INBOUND_API_KEY)) throw new AppError(401, "unauthorized", "Invalid webhook key.");
  next();
}

/**
 * Make calls this once its Gmail module is authorised, so the dashboard can show Gmail as connected.
 * Body: { userId, service: "gmail", connected: true|false }
 */
webhookRouter.post("/make/connection", webhookLimiter, requireMakeKey, async (req, res) => {
  const { userId, connected } = parse(makeConnectionSchema, req.body ?? {});
  const { rowCount } = await query("update users set gmail_connected = $2 where id = $1", [userId, connected]);
  if (!rowCount) throw notFound("User not found.");
  res.json({ ok: true });
});

async function requireKnownUser(userId) {
  const { rowCount } = await query("select 1 from users where id = $1", [userId]);
  if (!rowCount) throw notFound("User not found.");
}

/**
 * Make posts processed emails (classification, draft and meeting results) here, up to 200 per call.
 * Existing rows with the same emailId are updated. Real data replaces sample data row by row.
 * Body: { userId, emails: [{ emailId, threadId, receivedAt, priority, category, ... }] }
 */
webhookRouter.post("/make/emails", webhookLimiter, requireMakeKey, async (req, res) => {
  const { userId, emails } = parse(ingestEmailsSchema, req.body ?? {});
  await requireKnownUser(userId);
  res.json({ ok: true, saved: await upsertEmails(userId, emails) });
});

/** Body: { userId, candidates: [{ emailId, candidateName, role, ... }] } */
webhookRouter.post("/make/candidates", webhookLimiter, requireMakeKey, async (req, res) => {
  const { userId, candidates } = parse(ingestCandidatesSchema, req.body ?? {});
  await requireKnownUser(userId);
  res.json({ ok: true, saved: await upsertCandidates(userId, candidates) });
});

/**
 * Lets Make read a user's onboarding configuration before processing their mail, so a scenario
 * can look up pipelines, HR/Customer Care preferences and the knowledge base by userId alone.
 * Never includes the password hash, token version or any auth material.
 */
webhookRouter.get("/make/users/:userId/config", webhookLimiter, requireMakeKey, async (req, res) => {
  const { userId } = parse(userIdParamSchema, req.params);
  const profile = await getProfile(userId);
  if (!profile) throw notFound("User not found.");

  res.json({
    userId,
    profession: profile.profession,
    departments: profile.departments,
    pipelines: ["general", ...(profile.hrPreferences.enabled ? ["hr"] : []), ...(profile.customerCarePreferences.enabled ? ["customer_care"] : [])],
    hrPreferences: profile.hrPreferences,
    customerCarePreferences: profile.customerCarePreferences,
    knowledgeBase: profile.knowledgeBase,
  });
});
