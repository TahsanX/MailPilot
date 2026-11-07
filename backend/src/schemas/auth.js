import { z } from "zod";

export const nameSchema = z
  .string({ error: "Name is required." })
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(60, "Name must be 60 characters or fewer.")
  .regex(/^[\p{L}\p{N} ._-]+$/u, "Name can contain letters, numbers, spaces, dots, dashes and underscores.");

export const emailSchema = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address."));

/** bcrypt only uses the first 72 bytes, so longer passwords are rejected instead of silently truncated. */
export const passwordSchema = z
  .string({ error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password must be 72 bytes or fewer.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Password must contain at least one letter and one number.");

export const signupAccountSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Password is required." }).min(1, "Password is required.").max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6 digit code from your email."),
  newPassword: passwordSchema,
});

export const makeConnectionSchema = z.object({
  userId: z.uuid(),
  service: z.enum(["gmail"]),
  connected: z.boolean(),
});
