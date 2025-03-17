"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Ban, Clock } from "lucide-react";
import { MetricsChart } from "./MetricsChart";
import type { Analytics } from "@/types";
import { formatBytes } from "@/lib/utils";

interface NetworkMetricsProps {
  data?: Analytics["networkMetrics"];
}

export function NetworkMetrics({ data }: NetworkMetricsProps) {
  if (!data) return null;

  const chartData = [
    {
      name: "Traffic",
      value: data.totalTraffic / 1024 / 1024, // Convert to MB
      icon: Activity,
      color: "text-blue-500",
      format: (value: number) => `${value.toFixed(1)} MB`,
    },
    {
      name: "Anomalies",
      value: data.anomaliesDetected,
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      name: "Blocked",
      value: data.blockedConnections,
      icon: Ban,
      color: "text-red-500",
    },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Network Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricsChart data={chartData} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Average Latency</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.averageLatency.toFixed(1)}ms
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
