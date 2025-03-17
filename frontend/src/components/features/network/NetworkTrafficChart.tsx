"use client";

import { useApi } from "@/hooks/useApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { Loader2, Network } from "lucide-react";

interface Packet {
  timestamp: string;
  source: string;
  destination: string;
  protocol: number;
  length: number;
  ttl: number;
  sport: number;
  dport: number;
  flags: string;
}

interface NetworkTrafficChartProps {}

export function NetworkTrafficChart({}: NetworkTrafficChartProps) {
  const { data: trafficData, isLoading } = useApi<{
    success: boolean;
    data: {
      packets: Packet[];
    };
  }>("/network/traffic", 5000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const packets = trafficData?.data?.packets || [];

  // Group packets by minute intervals and calculate totals
  const chartData = packets
    .reduce((acc: any[], packet) => {
      const timestamp = new Date(packet.timestamp);
      // Round to nearest minute
      timestamp.setSeconds(0);
      const timeKey = timestamp.getTime();

      const existing = acc.find((item) => item.timestamp === timeKey);
      if (existing) {
        existing.totalBytes += packet.length;
        existing.totalPackets = Math.min(existing.totalPackets + 1, 20000); // Cap at 20K packets
        existing.bytesPerSecond = existing.totalBytes / 60;
      } else {
        acc.push({
          timestamp: timeKey,
          totalBytes: packet.length,
          totalPackets: 1,
          bytesPerSecond: packet.length / 60,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp);

  // Keep only last 10 minutes of data
  const lastTenMinutes = chartData.slice(-10);

  if (lastTenMinutes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400">
        <div className="text-center">
          <Network className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p>No network traffic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-300">
        <div>Network Traffic (Last 10 Minutes)</div>
        <div className="flex space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-400 mr-2" />
            <span>Throughput</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-400 mr-2" />
            <span>Packets</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={lastTenMinutes}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => {
                const date = new Date(time);
                return `${date.getHours().toString().padStart(2, "0")}:${date
                  .getMinutes()
                  .toString()
                  .padStart(2, "0")}`;
              }}
              stroke="#9CA3AF"
            />
            <YAxis
              yAxisId="bytes"
              tickFormatter={(value) => `${formatBytes(value)}/s`}
              stroke="#9CA3AF"
              label={{
                value: "Throughput",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#9CA3AF" },
              }}
            />
            <YAxis
              yAxisId="packets"
              orientation="right"
              domain={[0, 20000]}
              tickFormatter={(value) => `${value} pkts`}
              stroke="#9CA3AF"
              label={{
                value: "Packets",
                angle: 90,
                position: "insideRight",
                style: { fill: "#9CA3AF" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                color: "#E5E7EB",
              }}
              labelStyle={{ color: "#9CA3AF", marginBottom: "0.5rem" }}
              formatter={(value: any, name: string) => {
                if (name === "Throughput")
                  return [formatBytes(value) + "/s", name];
                return [value.toLocaleString(), name];
              }}
              labelFormatter={(label) => formatDateTime(new Date(label))}
            />
            <Line
              yAxisId="bytes"
              type="monotone"
              dataKey="bytesPerSecond"
              name="Throughput"
              stroke="#A78BFA"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#A78BFA",
                strokeWidth: 2,
                fill: "#1F2937",
              }}
            />
            <Line
              yAxisId="packets"
              type="monotone"
              dataKey="totalPackets"
              name="Packets"
              stroke="#34D399"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#34D399",
                strokeWidth: 2,
                fill: "#1F2937",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
