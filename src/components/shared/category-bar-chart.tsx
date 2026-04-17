"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useIsClient } from "@/components/shared/use-is-client";

export function CategoryBarChart({
  data,
  height = 300,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  height?: number;
}) {
  const isMounted = useIsClient();

  if (!isMounted) {
    return <div style={{ height }} className="w-full rounded-[20px] bg-panel/60" />;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(89, 102, 124, 0.14)" strokeDasharray="3 3" />
          <XAxis axisLine={false} type="number" allowDecimals={false} tickLine={false} />
          <YAxis
            axisLine={false}
            dataKey="label"
            type="category"
            tickLine={false}
            width={110}
            tick={{ fill: "#465065", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(16, 163, 154, 0.08)" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(143, 155, 179, 0.18)",
              background: "rgba(255, 255, 255, 0.96)",
            }}
          />
          <Bar dataKey="value" radius={[0, 12, 12, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
