import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { ChartBar } from "@phosphor-icons/react";
import Panel from "../common/Panel";
import EmptyState from "../common/EmptyState";
import { PRIORITY_LABELS } from "../../utils/constants";
import { formatNumber } from "../../utils/formatters";

const FILL = { urgent: "#ef6464", medium: "#e9b44c", low: "#929292" };

export default function PriorityChart({ status, error, onRetry, data, rangeLabel }) {
  const items = (data ?? []).map((d) => ({ ...d, label: PRIORITY_LABELS[d.key] }));
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <Panel title="Priority distribution" subtitle={`${rangeLabel}. Emails by priority.`} status={status} error={error} onRetry={onRetry}>
      {total === 0 ? (
        <EmptyState icon={ChartBar} title="No emails in this period">
          Priority counts appear once incoming mail has been ranked.
        </EmptyState>
      ) : (
        <>
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={items} margin={{ top: 24, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#313131" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} axisLine={false} tickLine={false} />
                <RTooltip cursor={{ fill: "#1f1f1f" }} contentStyle={{ background: "#272727", border: "1px solid #313131", borderRadius: 8 }} formatter={(v) => [formatNumber(v), "Emails"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {items.map((d) => (
                    <Cell key={d.key} fill={FILL[d.key]} />
                  ))}
                  <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Priority distribution, {rangeLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Priority</th>
                <th scope="col">Emails</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.key}>
                  <th scope="row">{d.label}</th>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Panel>
  );
}
