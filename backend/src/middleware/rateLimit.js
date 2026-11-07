import { rateLimit } from "express-rate-limit";

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: "rate_limited", message } }),
  });

const MIN = 60_000;

export const authLimiter = make(15 * MIN, 30, "Too many attempts. Try again in a few minutes.");
export const forgotLimiter = make(60 * MIN, 5, "Too many reset requests. Try again later.");
export const resetLimiter = make(60 * MIN, 10, "Too many attempts. Try again later.");
export const webhookLimiter = make(MIN, 120, "Too many requests.");
