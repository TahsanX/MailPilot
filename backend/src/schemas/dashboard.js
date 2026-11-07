import { z } from "zod";

export const summaryQuerySchema = z.object({
  range: z.enum(["7d", "30d", "all"]).default("30d"),
  // Browser's Date.getTimezoneOffset(): minutes behind UTC. Used to group by local day and hour.
  tzOffset: z.coerce.number().int().min(-840).max(840).default(0),
});

export const rangeQuerySchema = z.object({ range: z.enum(["7d", "30d", "all"]).default("all") });

const str = (max) => z.string().trim().max(max).default("");
const date = z.coerce.date({ error: "Enter a valid date." });

export const emailRecordSchema = z.object({
  emailId: z.string().trim().min(1).max(200),
  threadId: z.string().trim().min(1).max(200),
  receivedAt: date,
  senderName: str(200),
  senderEmail: str(254),
  subject: str(500),
  priority: z.enum(["urgent", "medium", "low"]),
  category: z.enum(["promotional", "productive", "transactional", "personal", "other"]),
  pipeline: z.enum(["general", "hr", "customer_care"]).default("general"),
  summary: str(2000),
  actionRequired: z.boolean().default(false),
  replyNeeded: z.boolean().default(false),
  draftCreated: z.boolean().default(false),
  status: z.enum(["unread", "draft_ready", "pending", "handled", "overdue", "delegated"]).default("pending"),
  repliedAt: date.nullish(),
  meetingCreated: z.boolean().default(false),
  cvProcessed: z.boolean().default(false),
  automationOutcome: z.enum(["not_started", "completed", "failed", "needs_human"]).default("not_started"),
});

export const candidateRecordSchema = z.object({
  emailId: z.string().trim().min(1).max(200),
  candidateName: str(200),
  role: str(200),
  experience: str(2000),
  education: str(2000),
  projects: str(4000),
  recommendation: str(2000),
  senderEmail: str(254),
  cvFilename: str(255),
  receivedAt: date,
});

export const ingestEmailsSchema = z.object({ userId: z.uuid(), emails: z.array(emailRecordSchema).min(1).max(200) });
export const ingestCandidatesSchema = z.object({ userId: z.uuid(), candidates: z.array(candidateRecordSchema).min(1).max(200) });
