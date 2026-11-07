import { config } from "../config.js";

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Sends a password reset code through Resend. In development without a key, the code is printed to the console. */
export async function sendPasswordResetOtp({ to, name, otp }) {
  const minutes = config.OTP_TTL_MINUTES;
  if (!config.RESEND_API_KEY) {
    if (config.isProd) throw new Error("RESEND_API_KEY is not configured.");
    console.warn(`[dev] RESEND_API_KEY not set. Password reset code for ${to}: ${otp}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: config.MAIL_FROM,
      to: [to],
      subject: "Your MailPilot password reset code",
      text: `Hi ${name},\n\nYour MailPilot password reset code is ${otp}.\nIt expires in ${minutes} minutes.\n\nIf you did not ask for this, you can ignore this email. Your password has not changed.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Your MailPilot password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>It expires in ${minutes} minutes.</p><p>If you did not ask for this, you can ignore this email. Your password has not changed.</p>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend responded with ${res.status}: ${detail.slice(0, 200)}`);
  }
}
