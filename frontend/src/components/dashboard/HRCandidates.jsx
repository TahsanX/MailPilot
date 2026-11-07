import { useState } from "react";
import { FileText, UserList, X } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import StatCard from "./StatCard";
import { METRICS } from "../../utils/metricDefinitions";
import { formatDate, formatNumber } from "../../utils/formatters";

const dash = (v) => (v && String(v).trim() ? v : "—");

export default function HRCandidates({ candidates, summary, rangeLabel }) {
  const { status, data, error, reload } = candidates;
  const [selected, setSelected] = useState(null);
  const list = data ?? [];
  const a = summary.data?.automation;
  const s = status === "loading" && !data ? "loading" : status === "error" && !data ? "error" : "ready";
  const current = list.find((c) => c.emailId === selected);

  return (
    <div className="stack-lg">
      <ul className="kpi-grid kpi-grid--inner">
        <li>
          <StatCard icon={FileText} label={METRICS.cvsProcessed.label} definition={METRICS.cvsProcessed.definition} value={formatNumber(a?.cvsProcessed)} caption={`${formatNumber(a?.cvsFailed ?? 0)} failed to parse`} rangeLabel={rangeLabel} status={summary.status === "loading" && !summary.data ? "loading" : "ready"} />
        </li>
      </ul>

      <Panel title="Recent candidates" subtitle={`${rangeLabel}. Fields missing from a CV are left blank (—).`} status={s} error={error} onRetry={reload}>
        {list.length === 0 ? (
          <EmptyState icon={UserList} title="No candidates yet">
            Candidate records appear here when an HR email with a CV attached is processed.
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" role="region" aria-label="Candidates table" tabIndex="0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Experience</th>
                    <th scope="col">Education</th>
                    <th scope="col">Projects</th>
                    <th scope="col">Recommendation</th>
                    <th scope="col">Received</th>
                    <th scope="col">CV file</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.emailId} className={c.emailId === selected ? "row--selected" : ""}>
                      <th scope="row">
                        <button type="button" className="row-btn" onClick={() => setSelected(c.emailId)} aria-expanded={c.emailId === selected}>
                          {dash(c.candidateName)}
                        </button>
                      </th>
                      <td>{dash(c.role)}</td>
                      <td className="cell-clip">{dash(c.experience)}</td>
                      <td className="cell-clip">{dash(c.education)}</td>
                      <td className="cell-clip">{dash(c.projects)}</td>
                      <td className="cell-clip">{dash(c.recommendation)}</td>
                      <td>{formatDate(c.receivedAt)}</td>
                      <td className="mono">{dash(c.cvFilename)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted scroll-hint">Scroll sideways to see every column.</p>
          </>
        )}
      </Panel>

      {current && (
        <section className="panel" aria-label={`Candidate details: ${current.candidateName}`}>
          <header className="panel__head">
            <h2 className="panel__title">{dash(current.candidateName)}</h2>
            <button type="button" className="icon-btn" onClick={() => setSelected(null)} aria-label="Close candidate details">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <dl className="kv">
            <div><dt>Role</dt><dd>{dash(current.role)}</dd></div>
            <div><dt>Experience</dt><dd>{dash(current.experience)}</dd></div>
            <div><dt>Education</dt><dd>{dash(current.education)}</dd></div>
            <div><dt>Projects</dt><dd>{dash(current.projects)}</dd></div>
            <div><dt>Recommendation</dt><dd>{dash(current.recommendation)}</dd></div>
            <div><dt>Sender email</dt><dd>{dash(current.senderEmail)}</dd></div>
            <div><dt>Received</dt><dd>{formatDate(current.receivedAt)}</dd></div>
            <div><dt>CV file</dt><dd className="mono">{dash(current.cvFilename)}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}
