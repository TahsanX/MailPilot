import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowSquareOut, CheckCircle, EnvelopeSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import Badge from "../common/Badge";
import { PriorityBadge, StatusBadge } from "./EmailBadges";
import { CATEGORY_LABELS, PIPELINE_LABELS, PRIORITY_LABELS, RANGES, STATUS_LABELS } from "../../utils/constants";
import { formatDateTime, gmailThreadUrl } from "../../utils/formatters";

const PAGE = 15;
const opts = (labels, allLabel) => [{ value: "all", label: allLabel }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))];

function Detail({ email, onClose, onMarkHandled }) {
  const closeRef = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, email.emailId]);

  return (
    <aside className="detail" aria-label="Email details">
      <div className="detail__head">
        <h2 className="t-h6">{email.subject}</h2>
        <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="badge-row">
        <PriorityBadge priority={email.priority} />
        <StatusBadge status={email.status} />
        <Badge>{PIPELINE_LABELS[email.pipeline]}</Badge>
      </div>
      <dl className="kv">
        <div><dt>From</dt><dd>{email.senderName} ({email.senderEmail})</dd></div>
        <div><dt>Received</dt><dd>{formatDateTime(email.receivedAt)}</dd></div>
        <div><dt>Category</dt><dd>{CATEGORY_LABELS[email.category]}</dd></div>
        <div><dt>Summary</dt><dd>{email.summary || "—"}</dd></div>
        <div><dt>Reply needed</dt><dd>{email.replyNeeded ? "Yes" : "No"}</dd></div>
        <div><dt>Draft</dt><dd>{email.draftCreated ? "Draft ready in Gmail" : "No draft"}</dd></div>
        <div><dt>Meeting created</dt><dd>{email.meetingCreated ? "Yes" : "No"}</dd></div>
        {email.pipeline === "hr" && <div><dt>CV processed</dt><dd>{email.cvProcessed ? "Yes" : "No"}</dd></div>}
      </dl>
      <div className="detail__actions">
        <a className="btn btn--secondary" href={gmailThreadUrl(email.threadId)} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOut size={18} aria-hidden="true" />
          <span>Open in Gmail<span className="sr-only"> (new tab)</span></span>
        </a>
        {email.status !== "handled" && (
          <Button
            variant="ghost"
            icon={CheckCircle}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onMarkHandled(email.emailId);
              setBusy(false);
            }}
          >
            Mark handled
          </Button>
        )}
      </div>
      <p className="muted detail__note">MailPilot does not send replies. Reply in Gmail, then mark the email as handled.</p>
    </aside>
  );
}

export default function EmailActivity({ activity, flags, onMarkHandled }) {
  const { status, data, error, reload } = activity;
  const [filters, setFilters] = useState({ q: "", priority: "all", category: "all", pipeline: "all", status: "all", range: "all" });
  const [visible, setVisible] = useState(PAGE);
  const [selectedId, setSelectedId] = useState(null);

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setVisible(PAGE);
  };

  const pipelineOptions = useMemo(() => {
    const labels = { general: PIPELINE_LABELS.general };
    if (flags.hr) labels.hr = PIPELINE_LABELS.hr;
    if (flags.care) labels.customer_care = PIPELINE_LABELS.customer_care;
    return opts(labels, "All pipelines");
  }, [flags.hr, flags.care]);

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.value === filters.range)?.days;
    const q = filters.q.trim().toLowerCase();
    return (data ?? []).filter((e) => {
      if (filters.priority !== "all" && e.priority !== filters.priority) return false;
      if (filters.category !== "all" && e.category !== filters.category) return false;
      if (filters.pipeline !== "all" && e.pipeline !== filters.pipeline) return false;
      if (filters.status !== "all" && e.status !== filters.status) return false;
      // eslint-disable-next-line react-hooks/purity
      if (days && Date.now() - new Date(e.receivedAt).getTime() > days * 86_400_000) return false;
      if (q && !`${e.subject} ${e.senderName} ${e.senderEmail}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filters]);

  const selected = (data ?? []).find((e) => e.emailId === selectedId);
  const shown = filtered.slice(0, visible);
  const s = status === "loading" && !data ? "loading" : status === "error" && !data ? "error" : "ready";
  const hasFilters = Object.entries(filters).some(([k, v]) => (k === "q" ? v : v !== "all"));

  return (
    <div className={`activity ${selected ? "activity--open" : ""}`}>
      <Panel title="Email activity" subtitle="Every processed email. Select one to see its summary." status={s} error={error} onRetry={reload}>
        <form className="filters" role="search" aria-label="Filter emails" onSubmit={(e) => e.preventDefault()}>
          <div className="filters__search">
            <Input label="Search" type="search" value={filters.q} onChange={set("q")} placeholder="Subject or sender" />
            <MagnifyingGlass size={18} className="filters__icon" aria-hidden="true" />
          </div>
          <Select label="Priority" value={filters.priority} onChange={set("priority")} options={opts(PRIORITY_LABELS, "All priorities")} />
          <Select label="Category" value={filters.category} onChange={set("category")} options={opts(CATEGORY_LABELS, "All categories")} />
          <Select label="Pipeline" value={filters.pipeline} onChange={set("pipeline")} options={pipelineOptions} />
          <Select label="Status" value={filters.status} onChange={set("status")} options={opts(STATUS_LABELS, "All statuses")} />
          <Select label="Date range" value={filters.range} onChange={set("range")} options={RANGES.map((r) => ({ value: r.value, label: r.value === "all" ? "All time" : r.long }))} />
        </form>

        <p className="filters__count" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "email" : "emails"}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={EnvelopeSimple}
            title={hasFilters ? "No emails match these filters" : "No email activity yet"}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={() => setFilters({ q: "", priority: "all", category: "all", pipeline: "all", status: "all", range: "all" })}>
                  Clear filters
                </Button>
              ) : null
            }
          >
            {hasFilters ? "Try removing a filter or searching for something else." : "Processed emails appear here once your Gmail automation is running."}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" role="region" aria-label="Email table" tabIndex="0">
              <table className="data-table table-desktop">
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    <th scope="col">Sender</th>
                    <th scope="col">Received</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Pipeline</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => (
                    <tr key={e.emailId} className={e.emailId === selectedId ? "row--selected" : ""}>
                      <th scope="row">
                        <button type="button" className="row-btn" onClick={() => setSelectedId(e.emailId)} aria-expanded={e.emailId === selectedId}>
                          {e.subject}
                        </button>
                      </th>
                      <td>{e.senderName}</td>
                      <td>{formatDateTime(e.receivedAt)}</td>
                      <td><PriorityBadge priority={e.priority} /></td>
                      <td>{PIPELINE_LABELS[e.pipeline]}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="cards-mobile">
              {shown.map((e) => (
                <li key={e.emailId}>
                  <button type="button" className="mail-card" onClick={() => setSelectedId(e.emailId)}>
                    <span className="mail-card__subject">{e.subject}</span>
                    <span className="mail-card__meta">{e.senderName} · {formatDateTime(e.receivedAt)}</span>
                    <span className="badge-row">
                      <PriorityBadge priority={e.priority} />
                      <StatusBadge status={e.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {filtered.length > visible && (
              <div className="more">
                <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
                  Show more ({filtered.length - visible} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>

      {selected && <Detail email={selected} onClose={() => setSelectedId(null)} onMarkHandled={onMarkHandled} />}
    </div>
  );
}
