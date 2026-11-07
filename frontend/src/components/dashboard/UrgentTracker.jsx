import { useState } from "react";
import { ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import Badge from "../common/Badge";
import { PriorityBadge } from "./EmailBadges";
import { METRICS } from "../../utils/metricDefinitions";
import { formatDateTime, gmailThreadUrl } from "../../utils/formatters";

const GROUPS = [
  { id: "unread", title: "Unread urgent", empty: "No unread urgent emails." },
  { id: "pending", title: "Pending urgent", empty: "No pending urgent emails. These are read but not yet handled." },
  { id: "overdue", title: "Overdue urgent", empty: "Nothing is overdue. Overdue means urgent for more than 48 hours without being handled." },
];

function Row({ email, onMarkHandled }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="urgent__row">
      <div className="urgent__main">
        <p className="urgent__subject">{email.subject}</p>
        <p className="urgent__meta">
          {email.senderName} · {formatDateTime(email.receivedAt)}
        </p>
        <div className="badge-row">
          <PriorityBadge priority={email.priority} />
          <Badge tone={email.draftCreated ? "brand" : "neutral"}>{email.draftCreated ? "Draft ready in Gmail" : "No draft"}</Badge>
        </div>
      </div>
      <div className="urgent__actions">
        <a className="btn btn--secondary btn--sm" href={gmailThreadUrl(email.threadId)} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOut size={18} aria-hidden="true" />
          <span>
            Open in Gmail<span className="sr-only"> (new tab): {email.subject}</span>
          </span>
        </a>
        <Button
          variant="ghost"
          size="sm"
          icon={CheckCircle}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onMarkHandled(email.emailId);
            setBusy(false);
          }}
          aria-label={`Mark handled: ${email.subject}`}
        >
          Mark handled
        </Button>
      </div>
    </li>
  );
}

export default function UrgentTracker({ status, error, onRetry, urgent, onMarkHandled }) {
  const list = urgent ?? [];
  return (
    <Panel
      title="Urgent email tracker"
      definition={METRICS.urgentPending.definition}
      subtitle="All urgent emails that are not yet handled. Replies are written and sent in Gmail, not here. Use Mark handled only after you have replied."
      status={status}
      error={error}
      onRetry={onRetry}
    >
      {list.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No urgent emails waiting">
          Urgent emails appear here with their draft status until you handle them.
        </EmptyState>
      ) : (
        <div className="urgent">
          {GROUPS.map((g) => {
            const rows = list.filter((e) => e.trackerState === g.id);
            return (
              <section key={g.id} className="urgent__group" aria-labelledby={`urgent-${g.id}`}>
                <h3 id={`urgent-${g.id}`} className="urgent__title">
                  {g.title} <span className="count-pill">{rows.length}</span>
                </h3>
                {rows.length === 0 ? (
                  <p className="muted urgent__empty">{g.empty}</p>
                ) : (
                  <ul>
                    {rows.map((e) => (
                      <Row key={e.emailId} email={e} onMarkHandled={onMarkHandled} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
