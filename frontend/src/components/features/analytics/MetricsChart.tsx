"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LucideIcon } from "lucide-react";

interface MetricsChartProps {
  data: Array<{
    name: string;
    value: number;
    icon: LucideIcon;
    color: string;
    format?: (value: number) => string;
  }>;
}

export function MetricsChart({ data }: MetricsChartProps) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
            }}
            labelStyle={{ color: "#9CA3AF" }}
            formatter={(value: number, name: string, entry: any) => {
              const item = data.find((d) => d.name === entry.payload.name);
              if (item?.format) {
                return [item.format(value), name];
              }
              return [value.toLocaleString(), name];
            }}
          />
          <Bar
            dataKey="value"
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
