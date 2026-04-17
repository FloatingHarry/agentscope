"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useIsClient } from "@/components/shared/use-is-client";

type SeriesConfig = {
  dataKey: string;
  name: string;
  color: string;
};

export function FrequencyChart<T extends object>({
  data,
  series,
  height = 320,
}: {
  data: T[];
  series: SeriesConfig[];
  height?: number;
}) {
  const isMounted = useIsClient();

  if (!isMounted) {
    return <div style={{ height }} className="w-full rounded-[20px] bg-panel/60" />;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgba(89, 102, 124, 0.16)" strokeDasharray="3 3" />
          <XAxis
            axisLine={false}
            dataKey="weekLabel"
            tickLine={false}
            tick={{ fill: "#6e7582", fontSize: 12 }}
          />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(143, 155, 179, 0.18)",
              background: "rgba(255, 255, 255, 0.96)",
            }}
          />
          {series.map((item) => (
            <Line
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.name}
              stroke={item.color}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
