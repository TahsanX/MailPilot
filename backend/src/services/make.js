import { config } from "../config.js";

/**
 * Sends an event to the Make.com custom webhook. Make is told about the user's setup
 * so its scenarios can run the right pipelines. Never throws: a Make outage must not break signup.
 * Passwords, email addresses and file contents are never included.
 */
export async function notifyMake(event, data) {
  if (!config.MAKE_WEBHOOK_URL) return { sent: false, reason: "not_configured" };
  try {
    const res = await fetch(config.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.MAKE_WEBHOOK_API_KEY ? { "x-make-apikey": config.MAKE_WEBHOOK_API_KEY } : {}),
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ event, sentAt: new Date().toISOString(), data }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return { sent: true };
  } catch (err) {
    console.error(`Make webhook failed for ${event}:`, err.message);
    return { sent: false, reason: "failed" };
  }
}
