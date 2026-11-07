import { z } from "zod";

export const PROFESSIONS = ["private_service_holder", "student", "business_owner", "freelancer", "other"];
export const DEPARTMENTS = ["hr", "customer_care"];
export const TONES = ["professional", "friendly", "empathetic", "direct"];

const text = (max) => z.string().trim().max(max, `Must be ${max} characters or fewer.`).default("");

const faqItem = z.object({
  question: text(300),
  answer: text(2000),
});

const faqs = z
  .array(faqItem)
  .max(30, "Add at most 30 questions.")
  .default([])
  .superRefine((items, ctx) => {
    items.forEach((f, i) => {
      if (f.question && !f.answer) ctx.addIssue({ code: "custom", path: [i, "answer"], message: "Add an answer for this question." });
      if (!f.question && f.answer) ctx.addIssue({ code: "custom", path: [i, "question"], message: "Add the question this answer belongs to." });
    });
  })
  // Fully empty pairs (the editor always shows one blank row) are dropped.
  .transform((items) => items.filter((f) => f.question && f.answer));

/**
 * The onboarding answers, in the same shape the frontend uses (design guide section 7).
 * `neither` is accepted for the frontend's convenience; the stored convention is departments: [].
 */
export const profileSchema = z
  .object({
    profession: z.enum(PROFESSIONS, { error: "Choose a profession." }),
    departments: z.array(z.enum(DEPARTMENTS)).max(2).default([]),
    neither: z.boolean().default(false),
    knowledgeBase: z
      .object({
        companyName: text(120),
        companyOverview: text(4000),
        faqs,
      })
      .default({ companyName: "", companyOverview: "", faqs: [] }),
    hrPreferences: z.object({ targetRole: text(120), jobDescription: text(4000) }).default({ targetRole: "", jobDescription: "" }),
    customerCarePreferences: z
      .object({ serviceContext: text(2000), responseTone: z.enum(TONES).default("professional") })
      .default({ serviceContext: "", responseTone: "professional" }),
  })
  .superRefine((p, ctx) => {
    const add = (path, message) => ctx.addIssue({ code: "custom", path, message });
    const unique = new Set(p.departments);
    if (unique.size !== p.departments.length) add(["departments"], "Departments must not repeat.");

    if (p.profession !== "private_service_holder") {
      if (p.departments.length) add(["departments"], "Departments apply only to private service holders.");
      if (p.neither) add(["neither"], "Neither applies only to private service holders.");
    } else {
      if (p.neither && p.departments.length) add(["neither"], "Neither cannot be combined with HR or Customer Service.");
      if (!p.neither && p.departments.length === 0) add(["departments"], "Select a department, or choose Neither of them.");
    }

    const hr = p.departments.includes("hr");
    const care = p.departments.includes("customer_care");
    if (hr || care) {
      if (!p.knowledgeBase.companyName) add(["knowledgeBase", "companyName"], "Enter your company name.");
      if (!p.knowledgeBase.companyOverview) add(["knowledgeBase", "companyOverview"], "Add a short description of the company.");
    }
    if (hr && !p.hrPreferences.targetRole) add(["hrPreferences", "targetRole"], "Enter the role you are hiring for.");
  });
