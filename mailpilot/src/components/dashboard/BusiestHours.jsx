import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Clock } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import { METRICS } from "../../utils/metricDefinitions";
import { formatNumber, hourLabel } from "../../utils/formatters";

export default function BusiestHours({ status, error, onRetry, data, rangeLabel }) {
  const hours = data ?? [];
  const max = Math.max(0, ...hours.map((h) => h.count));
  const peak = hours.find((h) => h.count === max);
  return (
    <Panel title="Busiest email hours" definition={METRICS.busiestHours.definition} subtitle={`${rangeLabel}. Local time.`} status={status} error={error} onRetry={onRetry}>
      {max === 0 ? (
        <EmptyState icon={Clock} title="No emails in this period">
          Hourly activity appears once mail arrives.
        </EmptyState>
      ) : (
        <>
          <p className="chart-note">
            Busiest hour: <strong>{hourLabel(peak.hour)}</strong> with {formatNumber(peak.count)} emails.
          </p>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hours} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#313131" strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={hourLabel} interval={2} tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                <RTooltip
                  cursor={{ fill: "#1f1f1f" }}
                  contentStyle={{ background: "#272727", border: "1px solid #313131", borderRadius: 8 }}
                  labelFormatter={hourLabel}
                  formatter={(v) => [formatNumber(v), "Emails"]}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {hours.map((h) => (
                    <Cell key={h.hour} fill={h.count === max ? "#9b8cff" : "#574aa8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="data-alt">
            <summary>View as table</summary>
            <table className="data-table data-table--compact">
              <caption className="sr-only">Emails received by hour</caption>
              <thead>
                <tr>
                  <th scope="col">Hour</th>
                  <th scope="col">Emails</th>
                </tr>
              </thead>
              <tbody>
                {hours.filter((h) => h.count > 0).map((h) => (
                  <tr key={h.hour}>
                    <th scope="row">{hourLabel(h.hour)}</th>
                    <td>{h.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Panel>
  );
}
