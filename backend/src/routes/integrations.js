import crypto from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";
import { webhookLimiter } from "../middleware/rateLimit.js";

export const integrationsRouter = Router();
integrationsRouter.use(requireAuth);

/** Read by Settings to show Gmail/Telegram connection state. Both are set by the automation service. */
integrationsRouter.get("/status", async (req, res) => {
  const { rows } = await query(
    `select gmail_email, (gmail_refresh_token is not null) as gmail_connected, (telegram_chat_id is not null) as telegram_connected
       from integrations where user_id = $1`,
    [req.user.id],
  );
  const row = rows[0] ?? { gmail_connected: false, telegram_connected: false, gmail_email: null };
  res.json({ gmailConnected: row.gmail_connected, gmailEmail: row.gmail_email, telegramConnected: row.telegram_connected });
});

const randomCode = () => crypto.randomInt(100_000, 999_999).toString();

/** A fresh code the user sends to the Telegram bot as "/start <code>" or "/link <code>". */
integrationsRouter.post("/telegram/link-code", webhookLimiter, async (req, res) => {
  await query("delete from telegram_link_codes where user_id = $1", [req.user.id]);

  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = randomCode();
    try {
      await query(
        "insert into telegram_link_codes (code, user_id, expires_at) values ($1, $2, now() + interval '10 minutes')",
        [code, req.user.id],
      );
      break;
    } catch (err) {
      if (err.code !== "23505" || attempt === 4) throw err; // collided on `code`: retry with a new one
    }
  }
  res.json({ code, expiresInMinutes: 10 });
});
