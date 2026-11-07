import { Users } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import { METRICS } from "../../utils/metricDefinitions";

export default function TopSenders({ status, error, onRetry, data, rangeLabel }) {
  const senders = data ?? [];
  const max = Math.max(1, ...senders.map((s) => s.count));
  return (
    <Panel title="Top five senders" definition={METRICS.topSenders.definition} subtitle={`${rangeLabel}. Ranked by incoming emails.`} status={status} error={error} onRetry={onRetry}>
      {senders.length === 0 ? (
        <EmptyState icon={Users} title="No senders yet">
          Senders appear here once mail arrives in this period.
        </EmptyState>
      ) : (
        <ol className="senders">
          {senders.map((s, i) => (
            <li key={s.email} className="senders__row">
              <span className="senders__rank">{i + 1}</span>
              <div className="senders__who">
                <p className="senders__name">{s.name}</p>
                <p className="senders__email">{s.email}</p>
                <span className="senders__bar" aria-hidden="true">
                  <span style={{ width: `${(s.count / max) * 100}%` }} />
                </span>
              </div>
              <span className="senders__count">
                {s.count} <span className="sr-only">emails</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
