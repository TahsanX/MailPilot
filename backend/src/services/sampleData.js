/**
 * SAMPLE DATA ONLY. Lets someone preview the dashboard before Make.com is connected.
 * Every row is stored with is_sample = true and the dashboard says so.
 */
import { clearSampleData, getPipelines, upsertCandidates, upsertEmails } from "./dashboard.js";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const DAYS = 90;
const SLA_HOURS = 48;

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SENDERS = [
  ["Amelia Hart", "amelia.hart@northwindlogistics.example", 9],
  ["Daniel Okafor", "d.okafor@brightpath.example", 7],
  ["Priya Raman", "priya@lumenstudio.example", 6],
  ["Billing Team", "billing@cloudmeter.example", 6],
  ["Marcus Lindqvist", "marcus@fjordsupply.example", 5],
  ["Sofia Alvarez", "sofia.alvarez@campusmail.example", 4],
  ["Weekly Digest", "digest@productnews.example", 8],
  ["Noah Bennett", "noah.bennett@example.com", 3],
  ["Hannah Cole", "hannah.cole@example.com", 3],
  ["Orders Desk", "orders@parcelhub.example", 5],
  ["Tomas Reyes", "tomas.reyes@example.com", 2],
  ["Grace Nwosu", "grace.nwosu@example.com", 2],
].map(([name, email, weight]) => ({ name, email, weight }));

const SUBJECTS = {
  promotional: ["Autumn plans are 20% off this week", "Your invitation to the product webinar", "New features you may have missed"],
  productive: ["Contract revision for review", "Question about the delivery schedule", "Meeting request for next Tuesday", "Updated project timeline", "Need your sign off on the budget"],
  transactional: ["Your invoice is ready", "Payment received, thank you", "Your order has shipped", "Password changed successfully"],
  personal: ["Dinner on Friday?", "Photos from the weekend", "Quick favour to ask"],
  other: ["Notice of scheduled maintenance", "Survey: tell us how we did"],
};
const SUMMARIES = {
  urgent: "The sender asks for a decision soon and mentions a deadline. A reply is needed.",
  medium: "The sender asks a question that needs an answer this week.",
  low: "Informational message. No action is required.",
};
const CANDIDATES = [
  { candidateName: "Elena Marković", role: "Senior Software Engineer", experience: "7 years in backend development", education: "BSc Computer Science", projects: "Payments API migration; internal analytics platform", recommendation: "Strong match for the role. Suggest an interview.", cvFilename: "elena_markovic_cv.pdf" },
  { candidateName: "Samir Haddad", role: "Senior Software Engineer", experience: "4 years in full stack development", education: "BEng Software Engineering", projects: "Booking platform for clinics", recommendation: "Partial match. Backend depth is limited.", cvFilename: "samir_haddad_resume.pdf" },
  { candidateName: "Chloe Whitaker", role: "Product Designer", experience: "5 years in product design", education: "BA Interaction Design", projects: "", recommendation: "Portfolio link is missing. Ask for it before deciding.", cvFilename: "chloe_whitaker.pdf" },
  { candidateName: "Arjun Mehta", role: "Senior Software Engineer", experience: "", education: "MSc Data Engineering", projects: "Streaming pipeline for logistics events", recommendation: "Experience section was not found in the CV.", cvFilename: "arjun_mehta_cv_2026.pdf" },
  { candidateName: "Lucia Fernandez", role: "Customer Success Lead", experience: "6 years in customer success", education: "BBA", projects: "", recommendation: "Good fit. Check references.", cvFilename: "lucia_fernandez.pdf" },
  { candidateName: "Kofi Mensah", role: "Senior Software Engineer", experience: "9 years across backend and infrastructure", education: "BSc Electrical Engineering", projects: "Multi region deployment tooling", recommendation: "Strong match. Salary expectations unknown.", cvFilename: "kofi_mensah_cv.pdf" },
];

const weighted = (rand, items) => {
  let r = rand() * items.reduce((s, i) => s + i.weight, 0);
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items.at(-1);
};
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

export function generateSample(now, { hr, care }) {
  const rand = rng(20260);
  const emails = [];
  let n = 0;
  for (let d = 0; d < DAYS; d++) {
    const day = new Date(now - d * DAY);
    const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
    const count = weekend ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 4);
    for (let k = 0; k < count; k++) {
      const hour = rand() < 0.65 ? pick(rand, [9, 10, 11, 14, 15, 16]) : Math.floor(7 + rand() * 13);
      let received = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, Math.floor(rand() * 60)));
      if (received.getTime() > now) received = new Date(now - Math.floor(rand() * 3) * HOUR - 600_000);

      const sender = weighted(rand, SENDERS);
      const pr = rand();
      const roll = rand();
      let pipeline = roll < 0.1 ? "hr" : roll < 0.24 ? "customer_care" : "general";
      if ((pipeline === "hr" && !hr) || (pipeline === "customer_care" && !care)) pipeline = "general";

      let category = weighted(rand, [
        { key: "promotional", weight: 22 },
        { key: "productive", weight: 34 },
        { key: "transactional", weight: 24 },
        { key: "personal", weight: 12 },
        { key: "other", weight: 8 },
      ]).key;
      if (pipeline !== "general") category = "productive";

      let priority = pr < 0.16 ? "urgent" : pr < 0.5 ? "medium" : "low";
      if (category === "promotional") priority = "low";
      if (pipeline === "customer_care" && priority === "low") priority = "medium";

      const replyNeeded = category === "productive" || category === "personal" ? rand() < 0.8 : false;
      const age = (now - received.getTime()) / HOUR;
      const draftCreated = replyNeeded && (priority === "urgent" || rand() < 0.35);

      let status;
      let repliedAt = null;
      if (!replyNeeded) status = age < 6 && rand() < 0.5 ? "unread" : "handled";
      else if (pipeline === "customer_care" && rand() < 0.25) status = "delegated";
      else if (age < 8) status = rand() < 0.55 ? "unread" : draftCreated ? "draft_ready" : "pending";
      else if (age < SLA_HOURS) status = rand() < 0.5 ? (draftCreated ? "draft_ready" : "pending") : rand() < 0.5 ? "handled" : "pending";
      else status = rand() < 0.82 ? "handled" : priority === "urgent" ? "overdue" : "pending";
      if (status === "handled" && replyNeeded) repliedAt = new Date(received.getTime() + (10 + Math.floor(rand() * 600)) * 60_000);

      const meetingCreated = category === "productive" && pipeline === "general" && rand() < 0.07;
      const cvProcessed = pipeline === "hr" && rand() < 0.85;
      let automationOutcome = "not_started";
      if (status === "delegated") automationOutcome = "needs_human";
      else if (pipeline === "hr") automationOutcome = cvProcessed ? "completed" : "failed";
      else if (draftCreated || meetingCreated) automationOutcome = rand() < 0.94 ? "completed" : "failed";
      else if (pipeline === "customer_care" && status === "handled") automationOutcome = "completed";

      n += 1;
      const subject =
        pipeline === "hr"
          ? "Application for the open position"
          : pipeline === "customer_care"
            ? pick(rand, ["Where is my order?", "Refund request", "How do I change my plan?", "Cannot sign in to my account"])
            : pick(rand, SUBJECTS[category]);

      emails.push({
        emailId: `sample-${n}`,
        threadId: `sample-thread-${n}`,
        receivedAt: received,
        senderName: sender.name,
        senderEmail: sender.email,
        subject,
        priority,
        category,
        pipeline,
        summary: SUMMARIES[priority],
        actionRequired: replyNeeded || meetingCreated,
        replyNeeded,
        draftCreated,
        status,
        repliedAt,
        meetingCreated,
        cvProcessed,
        automationOutcome,
      });
    }
  }

  const candidates = emails
    .filter((e) => e.pipeline === "hr" && e.cvProcessed)
    .map((e, i) => ({ ...CANDIDATES[i % CANDIDATES.length], emailId: e.emailId, senderEmail: `candidate${i + 1}@example.com`, receivedAt: e.receivedAt }));

  return { emails, candidates };
}

/** Replaces any earlier sample rows with a fresh set that matches the user's enabled pipelines. */
export async function loadSampleData(userId) {
  const { hr, care } = await getPipelines(userId);
  const { emails, candidates } = generateSample(Date.now(), { hr, care });
  await clearSampleData(userId);
  await upsertEmails(userId, emails, { isSample: true });
  await upsertCandidates(userId, candidates, { isSample: true });
  return { emails: emails.length, candidates: candidates.length };
}
