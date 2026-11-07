# MailPilot Frontend Design and Development Guide

**Project:** MailPilot — AI Email Assistant  
**Frontend stack:** React + JavaScript + Vite  
**UI libraries:** Phosphor React, Recharts  
**Automation:** Make.com  
**AI:** Gemini API through Make.com  
**Primary experience:** One-page React application with an onboarding experience and an in-app dashboard. No React Router is required for the first version.

This document is the source of truth for the frontend build. Implement the application section by section and follow the visual system below consistently. Do not invent a new visual style while implementing individual components.

---

## 1. Product intent and UX principles

MailPilot helps one user reduce repetitive email work. It connects to Gmail through Make.com, classifies incoming mail, prepares drafts for urgent emails, creates calendar events from confirmed meeting details, processes CV attachments when the HR pipeline is enabled, and supports customer-care responses from a company knowledge base.

The frontend is a control and analytics surface. It does **not** send email replies. Email replies and drafts are handled through Gmail and Make.com. The user remains in control of sending drafts.

### Primary user journey

1. User opens MailPilot.
2. User configures profession and, when relevant, department preferences.
3. User optionally adds general knowledge-base material. HR and Customer Service users provide basic company information and FAQs; PDF upload is also available.
4. User connects/configures Gmail automation.
5. User lands on the dashboard.
6. User reviews urgent mail, analytics, activity and any HR or customer-care information relevant to their selected pipelines.

### Product rules

- Always run the **General** pipeline for eligible mail.
- Run the **HR** pipeline only when HR is selected and an email is identified as HR-related with a CV attachment.
- Run the **Customer Care** pipeline only when Customer Service is selected and an email is customer-care related.
- A user may select HR, Customer Service, both, or Neither. Neither is exclusive and disables both optional pipelines.
- Non-private-service professions go directly to the General configuration path; do not show the department question unless the user is a Private Service Holder.
- Knowledge-base access is available to every user. Uploading documents is optional. When HR or Customer Service is enabled, collect at least company name and basic company information/FAQs. PDF upload remains optional.
- Do not fabricate dashboard figures. Use clearly marked sample data during UI development and replace it with Make data later.
- Mark email as handled only when the user or a confirmed automation action has actually handled it. Opening an email is not the same as replying to it.

---

## 2. Page architecture

Build a single-page application. Keep onboarding and the dashboard as separate views controlled by React state, not separate routes.

### View A — Welcome and onboarding

The initial screen should explain the outcome and start setup. The onboarding form can be presented as a focused card or step flow beneath the welcome heading.

**Above the fold must include:**

1. Clear outcome-focused headline.
2. Short subheadline explaining how MailPilot helps.
3. One primary CTA: `Set up my inbox`.
4. One genuine proof signal, such as a small workflow preview showing Gmail → AI classification → Make.com action. Do not invent testimonials, customer logos, adoption figures or performance claims.
5. A product visual or compact inbox preview.

**Mid-page content:**

- Problem and solution: inbox overload → prioritized, actionable email.
- Three to five outcome-led benefits.
- How it works in three steps: Connect Gmail, Configure your pipelines, Review the dashboard.
- Mandatory tagline reveal section (see Section 5.8).
- Product workflow preview.

**Bottom content:**

- Six to eight concise FAQs.
- Risk-reversal statement: drafts remain drafts until the user sends them; MailPilot does not send personal inbox replies from the dashboard.
- Final CTA: same action as the hero, `Set up my inbox`.

Do not add fake social proof. If no real testimonial or customer proof exists, use a real product workflow preview as the proof signal.

### Onboarding steps

Use a visible step indicator and allow the user to move back without losing entered values.

**Step 1 — Profession**

Question: `What's your profession?`

Options:
- Private Service Holder
- Student
- Business Owner
- Freelancer
- Other

Store a stable value such as `private_service_holder`, `student`, `business_owner`, `freelancer`, `other`.

**Step 2 — Department (conditional)**

Only show this when profession is `private_service_holder`.

Question: `Do you work with?`

Allow multiple selections:
- HR Department
- Customer Service
- Neither of them

Rules:
- HR and Customer Service may both be selected.
- Neither is exclusive. Selecting it clears HR and Customer Service.
- Selecting HR or Customer Service clears Neither.
- If the user chooses a non-private-service profession, skip this step and set both optional pipelines to disabled.

**Step 3 — Knowledge Base**

Knowledge-base setup is available to all users.

For everyone:
- Optional PDF upload area.
- Short explanation that uploaded content can help the assistant answer questions using the user's supplied information.
- A clear empty state when no file is uploaded.

When HR or Customer Service is enabled, also show:
- Company name.
- About the company / products / services.
- Repeatable FAQ question and answer pairs.
- Optional PDF upload.

For HR users, also show:
- Target role / position.
- Optional job description or hiring criteria.

For Customer Service users, also show:
- Service or product context.
- Optional response tone preference.

If both optional departments are selected, show the shared company information once, with any HR-specific fields grouped separately.

**Step 4 — Review and connect**

Show a review of profession, selected pipelines and knowledge-base configuration. Provide a clear next step to connect Gmail / activate Make automation. Do not imply Gmail is connected until the integration confirms it.

### View B — Dashboard

After successful setup, render the dashboard in the same SPA. Use a responsive application shell:

- Desktop: compact left sidebar + top header + scrollable main content.
- Tablet: collapsible sidebar or icon navigation.
- Mobile: compact top bar and a menu/drawer; do not squeeze a desktop sidebar into the viewport.

Navigation items should be conditional:

- Overview — always visible.
- Email activity — always visible.
- Analytics — always visible.
- HR candidates — only when HR is enabled.
- Customer Care — only when Customer Service is enabled.
- Settings / Knowledge Base — always visible.

The active navigation item must be visibly indicated. Navigation changes the active dashboard view without a full page reload.

---

## 3. Dashboard information architecture

### 3.1 Overview KPI cards

Show these first:

- Total emails received.
- Urgent pending.
- Drafts prepared.
- Estimated time saved.
- Emails handled automatically.
- Unanswered emails.

Every KPI should have a short definition tooltip or helper caption. Never show a metric without defining its time range.

### 3.2 Email purpose distribution

Use a donut chart for:

- Promotional.
- Productive.
- Transactional.
- Personal.
- Other.

Show both percentage and count in the legend/tooltip. Percentages must add up to 100% for the selected period, subject to rounding.

### 3.3 Priority distribution

Use a bar chart for:

- Urgent.
- Medium.
- Low.

Include a date range selector, for example 7 days, 30 days and all time.

### 3.4 Email volume trend

Use a line or area-free line chart to show incoming emails by day for the last seven or thirty days. Keep axes and labels readable. Do not use a filled gradient area chart.

### 3.5 Response and workload metrics

Include:

- Average response time.
- Unanswered email count.
- Top five senders.
- Busiest email hours.

Definitions:

- **Average response time:** elapsed time between an incoming email and the first matching outgoing reply in the same thread. Exclude threads without a response from this average and show the sample size.
- **Unanswered emails:** incoming emails that require a reply and have no matching outgoing reply. Do not treat unread status as the only signal.
- **Top five senders:** rank by incoming email count in the selected period. Display sender name/address and count.
- **Busiest email hours:** group incoming emails by received hour in the user's local timezone. A heatmap or 24-hour bar chart is suitable.

### 3.6 Automation and pipeline metrics

Include:

- Emails handled automatically.
- Automation success rate (successful completed actions divided by eligible automation attempts; show the denominator).
- Customer-care human handover count (only when Customer Service is enabled).
- CVs processed (only when HR is enabled).
- Meetings scheduled.

Definitions:

- **Emails handled automatically:** unique email threads where the configured automation completed the intended action without a manual intervention. Do not count a classification-only event as a completed task unless that is explicitly shown as a separate metric.
- **Customer-care handovers:** customer-care requests routed to a human because the knowledge base did not support a safe answer or policy requires human review.
- **CVs processed:** CV files successfully parsed and written to the candidate record/export. Failed parsing attempts should be shown separately.
- **Meetings scheduled:** confirmed calendar events created successfully. Avoid counting duplicate event attempts.

### 3.7 Urgent email tracker

Show three separate states:

- Unread urgent.
- Pending urgent (read but not handled/replied to).
- Overdue urgent (past the configured follow-up/SLA threshold and still pending).

Each row should show subject, sender, received time, priority, draft status and a link/action to open the original Gmail thread. The frontend must not send the reply.

### 3.8 Conditional pipeline panels

**HR panel** (only when enabled):
- CVs processed.
- Recent candidates.
- Candidate table with Name, Role, Experience, Education, Projects, Recommendation, Received date and CV filename.
- Empty state explaining that candidate records appear when an HR email with a CV is processed.
- Do not invent missing CV details. Empty source fields remain blank / display an em dash in the UI.

**Customer Care panel** (only when enabled):
- Human handover count.
- Recent customer-care conversations.
- Answer source / knowledge-base status.
- Resolved automatically versus delegated counts.
- Clear state when no knowledge-base document has been supplied.

### 3.9 Email activity view

Provide search and filters for:
- Priority.
- Category.
- Pipeline.
- Date range.
- Status (Unread, Draft ready, Pending, Handled, Overdue, Delegated).

Use a table on desktop and stacked list rows/cards on mobile. Do not place every data point in the row; keep the first view scannable and show detailed summary in a side panel or expandable row.

---

## 4. Component and folder structure

Use this structure. Add files only when a real component or responsibility requires them.

```text
mailpilot/
├── public/
│   ├── favicon.svg
│   └── logo.svg
├── src/
│   ├── assets/
│   │   └── images/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Checkbox.jsx
│   │   │   ├── FileUploader.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   └── Tooltip.jsx
│   │   ├── layout/
│   │   │   ├── AppShell.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Topbar.jsx
│   │   │   └── MobileNavigation.jsx
│   │   ├── onboarding/
│   │   │   ├── Onboarding.jsx
│   │   │   ├── StepIndicator.jsx
│   │   │   ├── ProfessionStep.jsx
│   │   │   ├── DepartmentStep.jsx
│   │   │   ├── KnowledgeBaseStep.jsx
│   │   │   ├── CompanyInfoForm.jsx
│   │   │   ├── FAQEditor.jsx
│   │   │   ├── HRPreferences.jsx
│   │   │   └── ReviewStep.jsx
│   │   └── dashboard/
│   │       ├── Overview.jsx
│   │       ├── StatCard.jsx
│   │       ├── EmailPurposeChart.jsx
│   │       ├── PriorityChart.jsx
│   │       ├── EmailTrendChart.jsx
│   │       ├── TopSenders.jsx
│   │       ├── BusiestHours.jsx
│   │       ├── UrgentTracker.jsx
│   │       ├── EmailActivity.jsx
│   │       ├── HRCandidates.jsx
│   │       ├── CustomerCarePanel.jsx
│   │       └── Settings.jsx
│   ├── data/
│   │   └── mockDashboardData.js
│   ├── services/
│   │   ├── makeWebhook.js
│   │   └── storageService.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── formatters.js
│   │   └── metricDefinitions.js
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── onboarding.css
│   │   ├── dashboard.css
│   │   └── responsive.css
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

### Component responsibilities

- `App.jsx`: decides whether to show welcome/onboarding or dashboard; owns top-level app state.
- `Onboarding.jsx`: controls current onboarding step and preserves form state when moving back and forth.
- Step components: render one step only; do not call Make directly.
- `AppShell.jsx`: dashboard layout and navigation.
- Dashboard components: receive data through props; do not contain hard-coded production values.
- `services/`: all integration calls live here. UI components call service functions rather than embedding webhook URLs.
- `data/mockDashboardData.js`: demo-only sample data; replace with service responses when Make integration is ready.
- `utils/metricDefinitions.js`: documents metric definitions and labels so the same meaning is used everywhere.

---

## 5. Visual design system — follow consistently

These rules are adapted from the supplied **Elaya Design — Landing Page System** skill. They are the visual source of truth for MailPilot.

### 5.1 Typography

Use one primary typeface throughout the product:

- Primary: **Manrope**.
- Optional data/code face: **Geist Mono** only for IDs or technical values where monospaced alignment helps.

Do not use Inter, Roboto, Arial, Open Sans or Helvetica. Do not mix multiple display fonts. No italic styling. Avoid ultra-bold/black weights; cap at 700.

Use the following named type scale rather than arbitrary font sizes:

| Style | Size / line height | Usage |
|---|---:|---|
| Heading 1 | 60 / 60 px | Landing hero on large screens |
| Heading 2 | 48 / 48 px | Major landing section |
| Heading 3 | 36 / 40 px | Tagline reveal / section title |
| Heading 4 | 30 / 36 px | Dashboard page title |
| Heading 5 | 24 / 32 px | Card or panel title |
| Heading 6 | 20 / 28 px | Subsection title |
| Title | 20–12 px | Labels and compact UI titles |
| Body | 16–14 px | Main readable content |
| Button | 18–12 px | CTA and controls |
| Caption | 14–12 px | Helper text, metadata and chart labels |

Apply `text-wrap: balance` to headings and `text-wrap: pretty` to body text where supported. Keep headings sentence case. Avoid orphaned one-word heading lines.

### 5.2 Spacing tokens

Use only this spacing scale for layout, gaps and padding:

| Token | Value |
|---|---:|
| Spacing 25 | 2 px |
| Spacing 50 | 4 px |
| Spacing 75 | 8 px |
| Spacing 100 | 12 px |
| Spacing 200 | 16 px |
| Spacing 300 | 24 px |
| Spacing 400 | 32 px |
| Spacing 500 | 40 px |
| Spacing 600 | 48 px |
| Spacing 700 | 64 px |
| Spacing 800 | 80 px |
| Spacing 900 | 96 px |

Main buttons use 8 px vertical and 12 px horizontal padding. Use consistent spacing rather than one-off values.

### 5.3 Corner radius

Use familiar Tailwind radius values consistently: `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` equivalents.

When a component is nested inside a rounded parent and the gap is below 32 px, use the nested-radius rule: `inner radius = outer radius − gap`, only when the result is greater than 2 px. Do not randomly mix radii.

### 5.4 Backgrounds, surfaces and borders

- Use flat backgrounds only. No gradient page backgrounds and no gradient card backgrounds.
- Never use a one-sided card border. A card border is either around all sides or absent.
- Use clear surface levels for page, panel, card, elevated menu and input surfaces.
- Dark theme base palette from the design skill: `#000000`, `#181818`, `#1F1F1F`, `#272727`, `#313131`, `#131209`.
- For MailPilot, use a restrained violet accent as a single project brand token; apply it consistently to primary actions, selected states and chart highlights. Do not add multiple competing accent colors.
- Status colors are semantic and reserved: urgent/error = red, warning/pending = amber, success = green, neutral = gray.
- Ensure text and controls meet accessible contrast. Do not rely on color alone to communicate a status; include text labels or icons.

### 5.5 Hero and landing page

- Keep headline + subheadline within 680 px maximum width.
- Use meaningful line breaks.
- A heading gradient is allowed only on the text: dark theme `#FFFFFF` to `#9B9B9B`; light theme `#000000` to `#666666`. Never use a gradient as a background.
- Keep one primary CTA above the fold. Do not place competing primary CTAs beside it.
- CTA text must say what happens, for example `Set up my inbox`, not `Learn more` or `Submit`.
- Lead with benefits, not feature names. Be specific without inventing measured results.

### 5.6 Icons

Use **Phosphor React** icons consistently (the supplied design system recommends Phosphor, Solar or Iconamoon). Do not use Material Icons or Material Symbols. Do not mix icon packs. Use one icon size family and consistent stroke weight. Icons should support the label, not replace critical text. Install with `npm install @phosphor-icons/react`. If `lucide-react` was installed during initial setup but has not been used, remove it with `npm uninstall lucide-react`.

### 5.7 Motion and interaction

- Base easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Main reveal duration: 500–800 ms depending on the interaction.
- Hover color/opacity transitions: 300 ms; never less than 200 ms.
- Animate only `transform` and `opacity` for routine UI motion.
- Button active state may use `scale(0.98)` or `translateY(1px)`.
- Support `prefers-reduced-motion`; replace movement with simple opacity changes or show the final state immediately.
- Scroll reveals should happen once, using `IntersectionObserver`; do not add unthrottled scroll listeners.
- Keep motion subtle. Never delay access to an important task with decorative animation.

### 5.8 Mandatory tagline reveal section

Include one large benefit statement in the mid-page landing content, separate from the hero.

- At least two lines.
- Use Heading 3 to Heading 1 scale.
- Begin at approximately 25–35% text opacity.
- Reveal words to full opacity/color in reading order as the user scrolls.
- Use per-word `IntersectionObserver` or a throttled animation-frame approach.
- With `prefers-reduced-motion`, display the final fully visible text immediately.

Suggested MailPilot tagline: **“Less time sorting email. More time doing meaningful work.”**

### 5.9 Content realism and copy

- Use complete, realistic UI copy. Never use Lorem ipsum.
- Use believable sample names and counts, and clearly mark all demo data as sample data.
- Do not invent customer logos, testimonials, company facts, AI accuracy, time saved or automation success claims.
- Avoid filler phrases such as “revolutionize”, “supercharge”, “cutting edge”, “effortless” and “transform your workflow”.
- Use sentence case for headings, labels and buttons.
- Avoid unnecessary hyphenated wording in visible UI copy. Technical identifiers and code names are not affected.

### 5.10 Required UI states

Every interactive component must have:

- Hover state: background/opacity shift or subtle scale.
- Active state: pressed feedback.
- Focus state: visible keyboard focus ring.
- Disabled state: visibly disabled and not interactive.
- Loading state: skeletons for content loading, not a spinner-only screen.
- Empty state: composed message explaining what will appear and the next useful action.
- Error state: specific inline message near the affected control. Never use `window.alert()`.
- Success state: clear inline confirmation or toast that does not obscure the page.

Forms must show field-level validation, preserve entered values when navigating between steps, and announce errors accessibly.

---

## 6. Design tokens starter file

Create `src/styles/tokens.css` and define all repeated design values in one place. The exact accent token below is the MailPilot brand choice; do not create additional accent colors ad hoc.

```css
:root {
  --font-sans: "Manrope", sans-serif;
  --font-mono: "Geist Mono", monospace;

  --space-25: 2px;
  --space-50: 4px;
  --space-75: 8px;
  --space-100: 12px;
  --space-200: 16px;
  --space-300: 24px;
  --space-400: 32px;
  --space-500: 40px;
  --space-600: 48px;
  --space-700: 64px;
  --space-800: 80px;
  --space-900: 96px;

  --color-page: #000000;
  --color-surface-1: #181818;
  --color-surface-2: #1f1f1f;
  --color-surface-3: #272727;
  --color-surface-4: #313131;
  --color-surface-warm: #131209;
  --color-text: #ffffff;
  --color-text-muted: #a3a3a3;
  --color-border: #313131;

  --color-brand: #9b8cff;
  --color-brand-hover: #ad9fff;
  --color-danger: #ef6464;
  --color-warning: #e9b44c;
  --color-success: #45b987;
  --color-neutral: #929292;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;

  --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-hover: 300ms;
  --duration-motion: 500ms;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

If a light theme is added later, define a complete alternate token set. Do not mix arbitrary light and dark surfaces inside the same view.

---

## 7. Data contracts for the UI

Use stable values in application state and API payloads. Display labels can be human-readable, but stored values must not change between components.

### Onboarding configuration

```js
const onboardingConfig = {
  profession: "private_service_holder",
  departments: ["hr", "customer_care"],
  knowledgeBase: {
    companyName: "",
    companyOverview: "",
    faqs: [{ question: "", answer: "" }],
    documents: [],
  },
  hrPreferences: {
    enabled: true,
    targetRole: "",
    jobDescription: "",
  },
  customerCarePreferences: {
    enabled: true,
    responseTone: "professional",
  },
};
```

For a user who selects Neither, store `departments: []` or a documented `none` value, but do not store `none` together with HR or Customer Service. Choose one convention and use it consistently in the UI and Make payload. Recommended: store `departments: []` and display “Neither”.

### Email activity record

```js
const emailActivity = {
  emailId: "",
  threadId: "",
  receivedAt: "",
  senderName: "",
  senderEmail: "",
  subject: "",
  priority: "urgent", // urgent | medium | low
  category: "productive", // promotional | productive | transactional | personal | other
  pipeline: "general", // general | hr | customer_care
  summary: "",
  actionRequired: false,
  replyNeeded: false,
  draftCreated: false,
  status: "pending", // unread | draft_ready | pending | handled | overdue | delegated
  meetingCreated: false,
  cvProcessed: false,
  automationOutcome: "not_started", // not_started | completed | failed | needs_human
};
```

### Candidate record

```js
const candidate = {
  candidateName: "",
  role: "",
  experience: "",
  education: "",
  projects: "",
  recommendation: "",
  senderEmail: "",
  cvFilename: "",
  receivedAt: "",
};
```

If a field is absent from a CV, preserve it as an empty string. Do not infer or fabricate candidate information.

---

## 8. Frontend integration boundaries

The first milestone uses mock data. Later, replace mock services with Make webhook calls without rewriting the components.

### Service layer rules

- Components must not contain Make webhook URLs.
- All webhook calls belong in `src/services/makeWebhook.js`.
- Keep payload construction and response validation inside the service layer.
- Show loading, success and error states in the UI.
- Add timeouts and handle invalid JSON / non-success HTTP responses.
- Do not assume a webhook succeeded until a successful response is received.
- Do not put Gemini API keys, Gmail tokens or other secrets in React code.
- Values prefixed with `VITE_` are exposed to the browser. Never treat them as secret credentials.
- For a personal local demo, a Make webhook URL can be configured for testing, but a frontend webhook URL is visible to anyone who can inspect the browser. Do not send sensitive mailbox content or private documents through a public client-side endpoint without a protected backend/proxy and proper validation.

### Suggested service function interface

```js
// src/services/makeWebhook.js
export async function saveOnboardingConfig(config) {}
export async function fetchDashboardSummary(filters) {}
export async function fetchEmailActivity(filters) {}
export async function markEmailHandled(emailId) {}
export async function fetchCandidates(filters) {}
export async function fetchCustomerCareStats(filters) {}
```

The UI should be written against these function names first, with mock implementations if Make scenarios are not ready.

### File upload UI

- Accept PDF files in the first version unless the Make workflow is explicitly extended to support other formats.
- Display filename, size, upload state and remove action.
- Validate file type and size before upload.
- Show a clear error if upload fails.
- Do not claim a file is indexed or available to the AI until Make/Gemini confirms successful processing.
- Explain that the knowledge base is optional for general users.

---

## 9. Responsive behaviour

Design mobile-first and verify at a minimum of 390 px viewport width.

### Mobile (390 px and above)

- One-column onboarding form.
- Full-width primary CTA where appropriate.
- Sidebar becomes a menu/drawer or compact top navigation.
- KPI cards use two columns only when labels remain readable; otherwise one column.
- Charts become full width and use concise labels.
- Tables become stacked cards or horizontally scrollable with a clear affordance.
- Touch targets should be comfortable and controls must not rely on hover.

### Tablet

- Two-column form or dashboard grid where space allows.
- Collapsible sidebar.
- Charts can sit side by side only if axis labels remain legible.

### Desktop

- Sidebar and main content layout.
- KPI cards in a consistent row/grid.
- Two-column analytics layout where it improves comparison.
- Keep the main content width readable; avoid stretching tables and paragraphs edge to edge.

Do not solve overflow by shrinking text below readable sizes. Reflow the layout instead.

---

## 10. Accessibility and shipping requirements

- Use semantic HTML: `header`, `nav`, `main`, `section`, `form`, `label`, `button`, `table` where appropriate.
- Add a skip-to-content link.
- Every input has a visible label and programmatic association.
- All controls must be keyboard operable.
- Keep a visible focus ring.
- Use appropriate `aria-live` messaging for form status and asynchronous results.
- Use alt text for meaningful images; decorative images should have empty alt text.
- Charts must have a text summary or accessible data table alternative.
- Priority and status must include text labels, not color alone.
- Add page title, meta description, Open Graph tags and favicon.
- Add Privacy and Terms links, even if they initially point to local placeholder pages with clearly marked draft content.
- Add a custom not-found/fallback view if the app later adopts routing.
- Check layout at 390 px.
- Test keyboard navigation, form validation, loading, empty and error states before marking a component complete.

---

## 11. Step-by-step implementation order

Build in this order. Finish and test one stage before moving to the next. Do not build the entire UI in one large component.

### Stage 1 — Project foundation

1. Confirm the Vite React JavaScript app runs with `npm run dev`.
2. Install `@phosphor-icons/react` and `recharts`.
3. Create the folder structure in Section 4.
4. Add Manrope font and `tokens.css`.
5. Create `global.css`, `App.jsx` and `main.jsx`.
6. Confirm the page loads without console errors.

**Done when:** the app opens locally, typography/tokens are applied and the responsive shell does not overflow at 390 px.

### Stage 2 — Welcome / landing content

1. Build the top navigation and brand mark.
2. Build hero headline, subheadline, primary CTA and real workflow preview.
3. Add problem/solution and three to five benefits.
4. Add three-step “How it works”.
5. Add the tagline reveal section.
6. Add FAQs, risk-reversal statement and final CTA.
7. Test reduced-motion behaviour and mobile layout.

**Done when:** the primary CTA clearly starts onboarding and no fake proof or unsupported claims appear.

### Stage 3 — Onboarding state and form components

1. Create the onboarding state object in one parent component.
2. Build ProfessionStep.
3. Build conditional DepartmentStep.
4. Enforce exclusive Neither selection.
5. Build KnowledgeBaseStep and optional PDF upload UI.
6. Build repeatable FAQEditor.
7. Build HRPreferences and Customer Care preferences conditionally.
8. Build ReviewStep.
9. Add field-level validation and previous/next navigation.
10. Save/recover draft form state in local storage for the local prototype.

**Done when:** all profession/department combinations work and going backwards does not erase data.

### Stage 4 — Dashboard shell and navigation

1. Build AppShell, Sidebar, Topbar and MobileNavigation.
2. Show navigation based on enabled departments.
3. Build Overview view with mock data.
4. Build reusable StatCard, Badge, EmptyState and Skeleton.
5. Add date-range filter state.

**Done when:** the dashboard is navigable on desktop and mobile, and optional pipeline navigation is hidden when disabled.

### Stage 5 — Dashboard analytics

1. Build purpose donut chart.
2. Build priority distribution chart.
3. Build email volume trend chart.
4. Build average response time and unanswered email cards.
5. Build Top 5 Senders.
6. Build Busiest Email Hours.
7. Build Emails Handled Automatically and Automation Success Rate.
8. Build Customer Care Human Handover count.
9. Build CVs Processed and Meetings Scheduled.
10. Build urgent tracker with unread, pending and overdue states.
11. Add loading, empty and error states to every panel.

**Done when:** every required metric is visible, has a definition and has a clear date range. Demo values are labelled as sample data.

### Stage 6 — Pipeline-specific screens

1. Build HR candidate table and candidate detail view.
2. Build Customer Care activity / handover panel.
3. Build Knowledge Base settings view.
4. Test conditional rendering for HR only, Customer Service only, both, and neither.

**Done when:** a user sees only the pipeline features they enabled.

### Stage 7 — Make integration

1. Keep all components using service functions.
2. Replace mock service functions with Make webhook calls.
3. Wire onboarding config save.
4. Wire dashboard summary and email activity fetch.
5. Wire mark-as-handled action.
6. Wire candidate and customer-care stats.
7. Validate response shape and show errors without breaking the dashboard.
8. Verify that frontend actions never send an email reply.

**Done when:** UI data comes from Make and all failures have a visible recovery state.

### Stage 8 — Final QA and portfolio polish

1. Test at 390 px, tablet and desktop widths.
2. Test all onboarding combinations.
3. Test keyboard-only operation and visible focus.
4. Test reduced motion.
5. Test empty mailbox, no CVs, no customer-care activity and no meetings.
6. Test failed webhook, slow webhook and invalid response.
7. Confirm no secrets are present in the frontend bundle.
8. Remove unused components, console logs and placeholder links.
9. Update page metadata, favicon, Privacy and Terms links.
10. Capture genuine screenshots of the running application for the README.

---

## 12. Definition of done

The frontend is considered complete when:

- [ ] The welcome view and onboarding are implemented as one SPA.
- [ ] Profession selection controls whether department selection appears.
- [ ] HR and Customer Service can be selected together.
- [ ] Neither is exclusive and optional pipelines are disabled when selected.
- [ ] General pipeline remains available to all users.
- [ ] Knowledge Base is available to every user and document upload is optional.
- [ ] HR / Customer Service users can enter company name, company overview and FAQs.
- [ ] HR users can enter target role / job criteria.
- [ ] Onboarding values persist while moving between steps.
- [ ] Dashboard shows every metric listed in Section 3.
- [ ] HR and Customer Care panels are conditional.
- [ ] Charts and KPI values have clear definitions and date ranges.
- [ ] Urgent email rows can open the original Gmail thread, but the dashboard cannot send replies.
- [ ] Loading, empty, error, success, disabled, hover and focus states exist.
- [ ] The layout works at 390 px and larger screen sizes.
- [ ] The visual system uses the specified typography, spacing, surfaces, radius, motion and icon rules.
- [ ] No fabricated metrics, testimonials, candidate data or company facts are presented as real.

---

## 13. Working agreement for future implementation steps

When implementing this guide:

1. Work one stage at a time and provide complete code for the current stage only.
2. Before creating a new component, check whether a reusable component already exists.
3. Keep each component focused and small; move repeated visual rules into shared components or CSS tokens.
4. Do not introduce TypeScript, Redux, React Router, Tailwind or a backend framework unless the project scope explicitly changes.
5. Do not wire real Make endpoints until the corresponding screen works with mock data.
6. After each stage, run the app and fix console errors before proceeding.
7. Keep this document updated if a deliberate product or design decision changes.
