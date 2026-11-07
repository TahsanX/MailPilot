export const PROFESSIONS = [
  { value: "private_service_holder", label: "Private Service Holder", description: "You work for a company or organisation." },
  { value: "student", label: "Student", description: "You study at a school, college or university." },
  { value: "business_owner", label: "Business Owner", description: "You run your own business." },
  { value: "freelancer", label: "Freelancer", description: "You work independently with clients." },
  { value: "other", label: "Other", description: "None of the options above." },
];

export const DEPARTMENTS = [
  { value: "hr", label: "HR Department", description: "Process CV attachments and keep a candidate record." },
  { value: "customer_care", label: "Customer Service", description: "Prepare answers from your company knowledge base." },
];

export const RESPONSE_TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "empathetic", label: "Empathetic" },
  { value: "direct", label: "Direct" },
];

export const PIPELINE_LABELS = {
  general: "General",
  hr: "HR",
  customer_care: "Customer Care",
};

export const PRIORITY_LABELS = { urgent: "Urgent", medium: "Medium", low: "Low" };

export const CATEGORY_LABELS = {
  promotional: "Promotional",
  productive: "Productive",
  transactional: "Transactional",
  personal: "Personal",
  other: "Other",
};

export const STATUS_LABELS = {
  unread: "Unread",
  draft_ready: "Draft ready",
  pending: "Pending",
  handled: "Handled",
  overdue: "Overdue",
  delegated: "Delegated",
};

export const RANGES = [
  { value: "7d", label: "7 days", days: 7, long: "Last 7 days" },
  { value: "30d", label: "30 days", days: 30, long: "Last 30 days" },
  { value: "all", label: "All time", days: null, long: "All time (sample data covers 90 days)" },
];

/** Colours used by charts. One brand hue in several steps plus neutrals. */
export const CHART_COLORS = ["#9b8cff", "#7767d9", "#574aa8", "#929292", "#5c5c5c"];

export const MAX_PDF_MB = 10;
export const MAX_PDF_FILES = 5;

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "SquaresFour" },
  { id: "activity", label: "Email activity", icon: "EnvelopeSimple" },
  { id: "analytics", label: "Analytics", icon: "ChartBar" },
  { id: "hr", label: "HR candidates", icon: "Users", requires: "hr" },
  { id: "care", label: "Customer Care", icon: "Headset", requires: "customer_care" },
  { id: "settings", label: "Settings and knowledge base", short: "Settings", icon: "Gear" },
];

export const FAQS = [
  {
    q: "Does MailPilot send emails for me?",
    a: "No. MailPilot prepares drafts in Gmail through your Make.com scenario. A draft stays a draft until you open it in Gmail and send it yourself. The dashboard has no send button.",
  },
  {
    q: "How does MailPilot connect to Gmail?",
    a: "Through a Make.com scenario that you control. The dashboard shows Gmail as connected only after the scenario confirms it.",
  },
  {
    q: "What happens to emails that are not urgent?",
    a: "Every eligible email is classified by purpose and priority so it appears in your activity list and analytics. Only urgent mail gets a prepared draft.",
  },
  {
    q: "Do I have to upload a knowledge base?",
    a: "No. Everyone can add one, but it is optional. If you choose HR or Customer Service, MailPilot asks for your company name, a short overview and FAQs so the assistant has something real to work from.",
  },
  {
    q: "What does the HR pipeline do?",
    a: "When HR is enabled and an email arrives with a CV attached, the details are read from the file and written to a candidate record. Fields missing from the CV stay blank.",
  },
  {
    q: "What does the Customer Care pipeline do?",
    a: "It prepares answers to customer questions using your knowledge base. If the knowledge base does not support a safe answer, the email is handed over to you.",
  },
  {
    q: "Which files can I upload?",
    a: "PDF files up to 10 MB each. A file is only described as available to the assistant after processing is confirmed.",
  },
  {
    q: "Are the numbers in the dashboard real?",
    a: "Until your Make.com scenarios are connected, the dashboard shows sample data and says so on every screen.",
  },
];
