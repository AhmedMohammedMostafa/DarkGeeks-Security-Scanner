"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Memory, HardDrive, Clock } from "lucide-react";
import { MetricsChart } from "./MetricsChart";
import type { Analytics } from "@/types";
import { formatBytes } from "@/lib/utils";

interface SystemMetricsProps {
  data?: Analytics["systemMetrics"];
}

export function SystemMetrics({ data }: SystemMetricsProps) {
  if (!data) return null;

  const chartData = [
    {
      name: "CPU",
      value: data.cpuUsage,
      icon: Cpu,
      color: "text-red-500",
      format: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      name: "Memory",
      value: data.memoryUsage,
      icon: Memory,
      color: "text-yellow-500",
      format: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      name: "Disk",
      value: data.diskUsage,
      icon: HardDrive,
      color: "text-blue-500",
      format: (value: number) => `${value.toFixed(1)}%`,
    },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">System Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricsChart data={chartData} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Uptime</span>
              </div>
              <p className="text-lg font-medium text-white">
                {formatUptime(data.uptime)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Disk Space</span>
              </div>
              <p className="text-lg font-medium text-white">
                {data.diskUsage.toFixed(1)}% used
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(" ") || "Just started";
}
