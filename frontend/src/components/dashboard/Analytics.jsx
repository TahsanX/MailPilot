import { ArrowBendUpLeft, Hourglass } from "@phosphor-icons/react";
import EmailPurposeChart from "./EmailPurposeChart";
import PriorityChart from "./PriorityChart";
import TopSenders from "./TopSenders";
import BusiestHours from "./BusiestHours";
import StatCard from "./StatCard";
import Panel from "../common/Panel";
import { METRICS } from "../../utils/metricDefinitions";
import { formatDuration, formatNumber } from "../../utils/formatters";

export default function Analytics({ summary, rangeLabel }) {
  const { status, data, error, reload } = summary;
  const s = status === "loading" && !data ? "loading" : status === "error" && !data ? "error" : "ready";
  const common = { status: s, error, onRetry: reload, rangeLabel };
  const r = data?.response;

  return (
    <div className="stack-lg">
      <Panel title="Response and workload" subtitle={`${rangeLabel}.`} status={s} error={error} onRetry={reload}>
        <ul className="kpi-grid kpi-grid--inner">
          <li>
            <StatCard
              icon={Hourglass}
              label={METRICS.avgResponse.label}
              definition={METRICS.avgResponse.definition}
              value={formatDuration(r?.avgMinutes)}
              caption={r ? (r.sampleSize > 0 ? `Based on ${formatNumber(r.sampleSize)} replied threads` : "No replied threads yet") : ""}
              rangeLabel={rangeLabel}
            />
          </li>
          <li>
            <StatCard icon={ArrowBendUpLeft} label={METRICS.unanswered.label} definition={METRICS.unanswered.definition} value={formatNumber(r?.unanswered)} caption="Need a reply, none sent" rangeLabel={rangeLabel} />
          </li>
        </ul>
      </Panel>

      <div className="grid-2">
        <EmailPurposeChart {...common} data={data?.purpose} />
        <PriorityChart {...common} data={data?.priority} />
        <TopSenders {...common} data={data?.topSenders} />
        <BusiestHours {...common} data={data?.hours} />
      </div>
    </div>
  );
}
