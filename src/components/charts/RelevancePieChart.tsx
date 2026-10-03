"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartWrapper } from "./ChartWrapper";

// Fixed order/color per relevance class -- validated categorical ramp
// (blue/orange/aqua/yellow), never cycled.
const COLORS: Record<string, string> = {
  DIRECT_RETRIEVAL: "var(--series-blue)",
  ADJACENT_RETRIEVAL: "var(--series-orange)",
  NOT_RELEVANT: "var(--series-aqua)",
  UNCERTAIN: "var(--series-yellow)",
};

export function RelevancePieChart({ byClassification }: { byClassification: Record<string, number> }) {
  const data = ["DIRECT_RETRIEVAL", "ADJACENT_RETRIEVAL", "NOT_RELEVANT", "UNCERTAIN"]
    .map((name) => ({ name, value: byClassification[name] ?? 0 }))
    .filter((d) => d.value > 0);

  return (
    <ChartWrapper title="Document-level relevance classification -- corpus context">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartWrapper>
  );
}
