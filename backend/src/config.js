import "dotenv/config";
import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  TRUST_PROXY: bool.default(false),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Supabase connection string)"),
  DATABASE_SSL: bool.default(true),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("MailPilot <onboarding@resend.dev>"),
  ALLOW_SAMPLE_DATA: bool.optional(),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  MAKE_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
  MAKE_WEBHOOK_API_KEY: z.string().optional(),
  MAKE_INBOUND_API_KEY: z.string().min(16).optional().or(z.literal("")),

  // Authorizes POST/GET /api/cron/process-pending. Vercel sends this automatically as
  // "Authorization: Bearer <CRON_SECRET>" for Cron Jobs once the env var is set.
  CRON_SECRET: z.string().min(16).optional().or(z.literal("")),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${lines.join("\n")}`);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  // Sample data is on by default everywhere except production.
  ALLOW_SAMPLE_DATA: parsed.data.ALLOW_SAMPLE_DATA ?? parsed.data.NODE_ENV !== "production",
  corsOrigins: parsed.data.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
};
