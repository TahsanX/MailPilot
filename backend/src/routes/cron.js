import crypto from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import { notifyReadyUsers, processPendingSummaries } from "../services/accounts.js";
import { AppError } from "../utils/errors.js";

export const cronRouter = Router();

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Vercel Cron Jobs call their target with GET and an "Authorization: Bearer <CRON_SECRET>"
 * header it adds automatically once CRON_SECRET is set as an env var on the project - nothing
 * else to configure on the Vercel side. The same header works for manual/local testing with curl.
 */
function requireCronSecret(req, _res, next) {
  if (!config.CRON_SECRET) throw new AppError(503, "cron_disabled", "CRON_SECRET is not configured.");
  const header = req.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${config.CRON_SECRET}`)) throw new AppError(401, "unauthorized", "Invalid cron secret.");
  next();
}

/**
 * Does the work that used to run fire-and-forget right after signup: summarize whatever PDFs are
 * still 'pending' (one bounded batch at a time), then notify Make for any user whose files have
 * all finished. Safe to call repeatedly or concurrently - each step only touches rows in the
 * state it expects, so a slow or overlapping tick just does less work rather than double-counting.
 */
cronRouter.get("/process-pending", requireCronSecret, async (_req, res) => {
  const summarized = await processPendingSummaries();
  const notified = await notifyReadyUsers();
  res.json({ ok: true, summarized, notified });
});
cronRouter.post("/process-pending", requireCronSecret, async (_req, res) => {
  const summarized = await processPendingSummaries();
  const notified = await notifyReadyUsers();
  res.json({ ok: true, summarized, notified });
});
