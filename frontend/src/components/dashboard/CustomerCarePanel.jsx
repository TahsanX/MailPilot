import { BookOpenText, ChatsCircle, Headset } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import Button from "../common/Button";
import Badge from "../common/Badge";
import StatCard from "./StatCard";
import { StatusBadge } from "./EmailBadges";
import { METRICS } from "../../utils/metricDefinitions";
import { formatDateTime, formatNumber } from "../../utils/formatters";

export default function CustomerCarePanel({ care, config, rangeLabel, onNavigate }) {
  const { status, data, error, reload } = care;
  const s = status === "loading" && !data ? "loading" : status === "error" && !data ? "error" : "ready";
  const kb = config.knowledgeBase;
  const faqCount = kb.faqs.filter((f) => f.question.trim() && f.answer.trim()).length;
  const docCount = kb.documents.length;
  const hasKb = faqCount > 0 || docCount > 0 || kb.companyOverview.trim();
  const cardStatus = s === "loading" ? "loading" : s === "error" ? "error" : "ready";

  return (
    <div className="stack-lg">
      <ul className="kpi-grid kpi-grid--inner">
        <li>
          <StatCard icon={Headset} label={METRICS.handovers.label} definition={METRICS.handovers.definition} value={formatNumber(data?.handovers)} caption="Routed to you" rangeLabel={rangeLabel} status={cardStatus} />
        </li>
        <li>
          <StatCard icon={ChatsCircle} label="Resolved automatically" definition="Customer care emails the automation answered without handing over." value={formatNumber(data?.resolvedAutomatically)} caption={data ? `of ${formatNumber(data.total)} conversations` : ""} rangeLabel={rangeLabel} status={cardStatus} />
        </li>
        <li>
          <StatCard icon={Headset} label="Delegated to you" definition="Conversations the assistant could not answer safely, so they were handed to you." value={formatNumber(data?.handovers)} caption="Needs a human answer" rangeLabel={rangeLabel} status={cardStatus} />
        </li>
      </ul>

      <Panel title="Answer source" subtitle="Where answers come from" headingLevel="h2">
        {hasKb ? (
          <ul className="kb-status">
            <li><BookOpenText size={20} aria-hidden="true" /> Company overview: {kb.companyOverview.trim() ? "provided" : "not provided"}</li>
            <li><BookOpenText size={20} aria-hidden="true" /> FAQs: {faqCount}</li>
            <li>
              <BookOpenText size={20} aria-hidden="true" /> PDF documents: {docCount} selected <Badge>Processing not confirmed</Badge>
            </li>
          </ul>
        ) : (
          <EmptyState
            icon={BookOpenText}
            title="No knowledge base supplied"
            action={
              <Button variant="secondary" onClick={() => onNavigate("settings")}>
                Open knowledge base
              </Button>
            }
          >
            Without company information, FAQs or documents, every customer question is handed over to you.
          </EmptyState>
        )}
      </Panel>

      <Panel title="Recent customer care conversations" subtitle={rangeLabel} status={s} error={error} onRetry={reload}>
        {(data?.conversations ?? []).length === 0 ? (
          <EmptyState icon={ChatsCircle} title="No customer care activity yet">
            Conversations appear here when a customer care email is processed.
          </EmptyState>
        ) : (
          <ul className="convo">
            {data.conversations.map((c) => (
              <li key={c.emailId} className="convo__row">
                <div>
                  <p className="convo__subject">{c.subject}</p>
                  <p className="muted">{c.senderName} · {formatDateTime(c.receivedAt)}</p>
                </div>
                <div className="badge-row">
                  <StatusBadge status={c.status} />
                  <Badge tone={c.status === "delegated" ? "neutral" : "success"}>{c.status === "delegated" ? "Handed over" : "Resolved automatically"}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
