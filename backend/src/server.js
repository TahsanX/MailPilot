import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { notifyReadyUsers, processPendingSummaries } from "./services/accounts.js";

const app = createApp();

try {
  await pool.query("select 1");
} catch (err) {
  console.error("Could not reach the database. Check DATABASE_URL and that the schema has been applied:", err.message);
  process.exit(1);
}

const server = app.listen(config.PORT, () => {
  console.log(`MailPilot API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  if (!config.GEMINI_API_KEY) console.warn("GEMINI_API_KEY is not set: PDF summaries will be marked failed.");
  if (!config.RESEND_API_KEY) console.warn("RESEND_API_KEY is not set: reset codes are printed to this console (development only).");
  if (!config.MAKE_WEBHOOK_URL) console.warn("MAKE_WEBHOOK_URL is not set: Make.com will not be notified.");
});

/**
 * In production the cron queue (POST/GET /api/cron/process-pending) is driven by Vercel Cron.
 * Here, where the process stays alive, this interval plays the same role so local dev and
 * `npm start` on a normal host still summarize PDFs and notify Make without any extra setup.
 */
const queueTimer = setInterval(() => {
  processPendingSummaries()
    .then(() => notifyReadyUsers())
    .catch((err) => console.error("Queue tick failed:", err.message));
}, 10_000);
queueTimer.unref();

function shutdown() {
  clearInterval(queueTimer);
  server.close(() => pool.end().then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
