import { Router } from "express";
import { config } from "../config.js";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter, forgotLimiter, resetLimiter } from "../middleware/rateLimit.js";
import { looksLikePdf, uploadDocuments } from "../middleware/upload.js";
import { parse } from "../middleware/validate.js";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupAccountSchema } from "../schemas/auth.js";
import { profileSchema } from "../schemas/profile.js";
import { createAccount, getProfile, publicUser } from "../services/accounts.js";
import { sendPasswordResetOtp } from "../services/mail.js";
import { generateOtp, hashOtp, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, otpMatches } from "../services/otp.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { signToken } from "../services/token.js";
import { AppError, unauthorized } from "../utils/errors.js";

export const authRouter = Router();

/**
 * Signup is the only place the onboarding answers and PDFs are accepted.
 * multipart/form-data: name, email, password, profile (JSON string), documents (0 to 5 PDFs).
 */
authRouter.post("/signup", authLimiter, uploadDocuments, async (req, res) => {
  const body = req.body ?? {};

  let rawProfile;
  let profileJsonError;
  try {
    rawProfile = typeof body.profile === "string" ? JSON.parse(body.profile) : body.profile;
  } catch {
    profileJsonError = { profile: "The profile field must be valid JSON." };
  }

  // Validate account and answers together so the user sees every problem in one response.
  const results = [signupAccountSchema.safeParse(body), profileJsonError ? null : profileSchema.safeParse(rawProfile ?? {})];
  const fields = { ...profileJsonError };
  for (const r of results) {
    if (r && !r.success) {
      for (const issue of r.error.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
    }
  }
  if (Object.keys(fields).length) throw new AppError(400, "validation_error", "Some fields need attention.", fields);
  const account = results[0].data;
  const profile = results[1].data;

  const files = req.files ?? [];
  for (const f of files) {
    if (!looksLikePdf(f.buffer)) throw new AppError(400, "invalid_file", `${f.originalname} is not a valid PDF.`);
  }

  const { user, token } = await createAccount({ account, profile, files });
  res.status(201).json({ token, user: publicUser(user), profile: await getProfile(user.id) });
});

/** Login goes straight to the dashboard: the response carries everything the dashboard needs. */
authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body ?? {});
  const { rows } = await query("select * from users where lower(email) = $1", [email]);
  const user = rows[0];

  const ok = await verifyPassword(password, user?.password_hash);
  if (!user || !ok) throw unauthorized("Email or password is incorrect.");

  res.json({ token: signToken(user), user: publicUser(user), profile: await getProfile(user.id) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user), profile: await getProfile(req.user.id) });
});

const GENERIC_SENT = "If an account exists for that email, a code has been sent.";

authRouter.post("/forgot-password", forgotLimiter, async (req, res) => {
  const { email } = parse(forgotPasswordSchema, req.body ?? {});
  const { rows } = await query("select id, name, email from users where lower(email) = $1", [email]);
  const user = rows[0];

  if (user) {
    const recent = await query(
      "select 1 from password_resets where user_id = $1 and created_at > now() - make_interval(secs => $2) limit 1",
      [user.id, OTP_RESEND_COOLDOWN_SECONDS],
    );
    if (recent.rowCount === 0) {
      const otp = generateOtp();
      const reset = await withTransaction(async (c) => {
        await c.query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [user.id]);
        return (
          await c.query(
            `insert into password_resets (user_id, otp_hash, expires_at)
             values ($1, $2, now() + make_interval(mins => $3)) returning id`,
            [user.id, hashOtp(user.id, otp), config.OTP_TTL_MINUTES],
          )
        ).rows[0];
      });
      try {
        await sendPasswordResetOtp({ to: user.email, name: user.name, otp });
      } catch (err) {
        // Logged but not reported to the caller, so the response never reveals whether the email exists.
        console.error("Could not send reset email:", err.message);
        await query("update password_resets set used_at = now() where id = $1", [reset.id]);
      }
    }
  }
  res.json({ message: GENERIC_SENT });
});

authRouter.post("/reset-password", resetLimiter, async (req, res) => {
  const { email, otp, newPassword } = parse(resetPasswordSchema, req.body ?? {});
  const invalid = () => new AppError(400, "invalid_code", "That code is incorrect or has expired.");

  const { rows } = await query("select id from users where lower(email) = $1", [email]);
  const user = rows[0];
  if (!user) throw invalid();

  // Count the attempt first so parallel guesses cannot exceed the limit.
  const attempt = await query(
    `update password_resets set attempts = attempts + 1
      where id = (
        select id from password_resets
         where user_id = $1 and used_at is null and expires_at > now() and attempts < $2
         order by created_at desc limit 1)
      returning id, otp_hash`,
    [user.id, OTP_MAX_ATTEMPTS],
  );
  const reset = attempt.rows[0];
  if (!reset || !otpMatches(user.id, otp, reset.otp_hash)) throw invalid();

  const passwordHash = await hashPassword(newPassword);
  await withTransaction(async (c) => {
    // Bumping token_version signs out every existing session.
    await c.query("update users set password_hash = $2, token_version = token_version + 1 where id = $1", [user.id, passwordHash]);
    await c.query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [user.id]);
  });

  res.json({ message: "Your password has been changed. Log in with the new password." });
});
