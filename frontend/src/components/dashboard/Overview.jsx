import { ArrowBendUpLeft, Calendar, FileText, Headset, Lightning, NotePencil, Robot, Timer, Tray, WarningOctagon } from "@phosphor-icons/react";
import StatCard from "./StatCard";
import UrgentTracker from "./UrgentTracker";
import EmailTrendChart from "./EmailTrendChart";
import Panel from "../common/Panel";
import { METRICS } from "../../utils/metricDefinitions";
import { formatDuration, formatNumber } from "../../utils/formatters";

export default function Overview({ summary, rangeLabel, range, flags, onMarkHandled }) {
  const { status, data, error, reload } = summary;
  const k = data?.kpis;
  const a = data?.automation;
  const cardStatus = status === "loading" && !data ? "loading" : status === "error" && !data ? "error" : "ready";
  const rate = a && a.attempts > 0 ? Math.round((a.successCount / a.attempts) * 100) : null;

  return (
    <div className="stack-lg">
      {status === "error" && data && (
        <p className="inline-error" role="alert">
          Could not refresh the latest figures. Showing the last loaded data. {error}
        </p>
      )}

      <section aria-label="Key figures">
        <ul className="kpi-grid">
          <li>
            <StatCard icon={Tray} label={METRICS.totalReceived.label} definition={METRICS.totalReceived.definition} value={formatNumber(k?.totalReceived)} caption="Emails processed" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
          <li>
            <StatCard icon={WarningOctagon} label={METRICS.urgentPending.label} definition={METRICS.urgentPending.definition} value={formatNumber(k?.urgentPending)} caption="Unread, pending or overdue" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
          <li>
            <StatCard icon={NotePencil} label={METRICS.draftsPrepared.label} definition={METRICS.draftsPrepared.definition} value={formatNumber(k?.draftsPrepared)} caption="Waiting in Gmail" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
          <li>
            <StatCard icon={Timer} label={METRICS.timeSaved.label} definition={METRICS.timeSaved.definition} value={formatDuration(k?.timeSavedMinutes)} caption="Estimate, not measured" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
          <li>
            <StatCard icon={Robot} label={METRICS.handledAutomatically.label} definition={METRICS.handledAutomatically.definition} value={formatNumber(k?.handledAutomatically)} caption="Completed without manual help" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
          <li>
            <StatCard icon={ArrowBendUpLeft} label={METRICS.unanswered.label} definition={METRICS.unanswered.definition} value={formatNumber(k?.unanswered)} caption="Need a reply, none sent" rangeLabel={rangeLabel} status={cardStatus} />
          </li>
        </ul>
      </section>

      <UrgentTracker status={cardStatus} error={error} onRetry={reload} urgent={data?.urgent} onMarkHandled={onMarkHandled} />

      <EmailTrendChart status={cardStatus} error={error} onRetry={reload} data={data?.trend} days={data?.trendDays ?? 30} range={range} />

      <Panel title="Automation and pipelines" subtitle={`${rangeLabel}. What the Make.com scenarios completed.`} status={cardStatus} error={error} onRetry={reload}>
        <ul className="kpi-grid kpi-grid--inner">
          <li>
            <StatCard
              icon={Lightning}
              label={METRICS.successRate.label}
              definition={METRICS.successRate.definition}
              value={rate == null ? "—" : `${rate}%`}
              caption={a ? (a.attempts > 0 ? `${formatNumber(a.successCount)} of ${formatNumber(a.attempts)} eligible actions` : "No automation attempts yet") : ""}
              rangeLabel={rangeLabel}
            />
          </li>
          <li>
            <StatCard icon={Calendar} label={METRICS.meetings.label} definition={METRICS.meetings.definition} value={formatNumber(a?.meetings)} caption="Confirmed calendar events" rangeLabel={rangeLabel} />
          </li>
          {flags.care && (
            <li>
              <StatCard icon={Headset} label={METRICS.handovers.label} definition={METRICS.handovers.definition} value={formatNumber(a?.handovers)} caption="Routed to you" rangeLabel={rangeLabel} />
            </li>
          )}
          {flags.hr && (
            <li>
              <StatCard
                icon={FileText}
                label={METRICS.cvsProcessed.label}
                definition={METRICS.cvsProcessed.definition}
                value={formatNumber(a?.cvsProcessed)}
                caption={`${formatNumber(a?.cvsFailed ?? 0)} failed to parse`}
                rangeLabel={rangeLabel}
              />
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
