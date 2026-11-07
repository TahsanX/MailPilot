import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { ChartLine } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import { formatNumber, formatShortDay } from "../../utils/formatters";

export default function EmailTrendChart({ status, error, onRetry, data, days, range }) {
  const points = data ?? [];
  const total = points.reduce((s, p) => s + p.count, 0);
  const capped = range === "all";
  return (
    <Panel
      title="Email volume"
      subtitle={`Incoming emails per day, last ${days} days${capped ? " (the chart shows the most recent 30 days for All time)" : ""}.`}
      status={status}
      error={error}
      onRetry={onRetry}
    >
      {total === 0 ? (
        <EmptyState icon={ChartLine} title="No emails received in this period">
          The daily trend appears once mail arrives.
        </EmptyState>
      ) : (
        <>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#313131" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatShortDay} tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                <RTooltip
                  contentStyle={{ background: "#272727", border: "1px solid #313131", borderRadius: 8 }}
                  labelFormatter={formatShortDay}
                  formatter={(v) => [formatNumber(v), "Emails"]}
                />
                <Line type="monotone" dataKey="count" stroke="#9b8cff" strokeWidth={2} dot={{ r: 2, fill: "#9b8cff" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="data-alt">
            <summary>View as table</summary>
            <table className="data-table data-table--compact">
              <caption className="sr-only">Incoming emails per day</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Emails</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date}>
                    <th scope="row">{formatShortDay(p.date)}</th>
                    <td>{p.count}</td>
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
