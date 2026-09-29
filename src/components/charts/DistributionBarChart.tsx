"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartWrapper } from "./ChartWrapper";

export function DistributionBarChart({
  title,
  data,
  color = "var(--series-blue)",
  limit = 10,
}: {
  title: string;
  data: Record<string, number>;
  color?: string;
  limit?: number;
}) {
  const chartData = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));

  return (
    <ChartWrapper title={title}>
      {chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted)" />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} stroke="var(--muted)" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartWrapper>
  );
}
