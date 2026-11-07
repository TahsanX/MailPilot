/** One definition per metric so the same meaning is used on every screen. */
export const METRICS = {
  totalReceived: {
    label: "Total emails received",
    definition: "Incoming emails that MailPilot processed in the selected period.",
  },
  urgentPending: {
    label: "Urgent pending",
    definition: "Urgent emails that are unread, pending or overdue. Handled and delegated emails are not counted.",
  },
  draftsPrepared: {
    label: "Drafts prepared",
    definition: "Gmail drafts created by the automation. A draft is not a sent reply.",
  },
  timeSaved: {
    label: "Estimated time saved",
    definition: "An estimate: 4 minutes for each draft prepared and 1 minute for each email classified. It is not a measured value.",
  },
  handledAutomatically: {
    label: "Emails handled automatically",
    definition: "Unique threads where the automation completed its intended action without manual help. Classification alone does not count.",
  },
  unanswered: {
    label: "Unanswered emails",
    definition: "Incoming emails that need a reply and have no matching outgoing reply. Unread status is not the only signal.",
  },
  avgResponse: {
    label: "Average response time",
    definition: "Time between an incoming email and the first reply in the same thread. Threads without a reply are excluded.",
  },
  topSenders: {
    label: "Top five senders",
    definition: "Senders ranked by number of incoming emails in the selected period.",
  },
  busiestHours: {
    label: "Busiest email hours",
    definition: "Incoming emails grouped by the hour received, in your local timezone.",
  },
  successRate: {
    label: "Automation success rate",
    definition: "Completed automation actions divided by eligible automation attempts.",
  },
  handovers: {
    label: "Customer care handovers",
    definition: "Customer care requests routed to you because the knowledge base could not support a safe answer.",
  },
  cvsProcessed: {
    label: "CVs processed",
    definition: "CV files parsed and written to the candidate record. Failed parsing attempts are shown separately.",
  },
  meetings: {
    label: "Meetings scheduled",
    definition: "Confirmed calendar events created successfully. Duplicate attempts are not counted.",
  },
};
