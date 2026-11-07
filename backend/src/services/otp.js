import crypto from "node:crypto";
import { config } from "../config.js";

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Cryptographically random 6 digit code. */
export const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

// OTPs are short, so a keyed hash (not a plain one) stops anyone with a database dump from brute forcing them offline.
export const hashOtp = (userId, otp) => crypto.createHmac("sha256", config.JWT_SECRET).update(`${userId}:${otp}`).digest("hex");

export function otpMatches(userId, otp, storedHash) {
  const a = Buffer.from(hashOtp(userId, otp), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
