import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import { ChartDonut } from "@phosphor-icons/react";
import { CATEGORY_LABELS, CHART_COLORS } from "../../utils/constants";
import { formatNumber, withPercentages } from "../../utils/formatters";

function TipBody({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{CATEGORY_LABELS[d.key]}</strong>
      <span>
        {formatNumber(d.count)} emails · {d.percent}%
      </span>
    </div>
  );
}

export default function EmailPurposeChart({ status, error, onRetry, data, rangeLabel }) {
  const items = data ? withPercentages(data) : [];
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <Panel title="Email purpose" subtitle={`${rangeLabel}. Share of ${formatNumber(total)} emails by purpose.`} status={status} error={error} onRetry={onRetry}>
      {total === 0 ? (
        <EmptyState icon={ChartDonut} title="No emails in this period">
          Purpose categories appear here once MailPilot has classified incoming mail.
        </EmptyState>
      ) : (
        <div className="donut">
          <div className="donut__chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={items} dataKey="count" nameKey="key" innerRadius={62} outerRadius={96} paddingAngle={2} stroke="none">
                  {items.map((d, i) => (
                    <Cell key={d.key} fill={CHART_COLORS[i]} />
                  ))}
                </Pie>
                <RTooltip content={<TipBody />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <table className="legend-table">
            <caption className="sr-only">Email purpose distribution, {rangeLabel}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Emails</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, i) => (
                <tr key={d.key}>
                  <th scope="row">
                    <span className="swatch" style={{ background: CHART_COLORS[i] }} aria-hidden="true" />
                    {CATEGORY_LABELS[d.key]}
                  </th>
                  <td>{formatNumber(d.count)}</td>
                  <td className="muted">{d.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
