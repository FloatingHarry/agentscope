"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

export function TrendChart<T extends object>({
  data,
  series,
  height = 300,
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
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {series.map((item) => (
              <linearGradient
                key={`gradient-${item.dataKey}`}
                id={`gradient-${item.dataKey}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={item.color} stopOpacity={0.32} />
                <stop offset="95%" stopColor={item.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
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
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.14)",
            }}
          />
          {series.map((item) => (
            <Area
              key={item.dataKey}
              type="monotone"
              dataKey={item.dataKey}
              name={item.name}
              stroke={item.color}
              fill={`url(#gradient-${item.dataKey})`}
              strokeWidth={2.4}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
