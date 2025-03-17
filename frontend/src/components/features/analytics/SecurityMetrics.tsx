"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Search, Clock } from "lucide-react";
import { MetricsChart } from "./MetricsChart";
import type { Analytics } from "@/types";

interface SecurityMetricsProps {
  data?: Analytics["securityMetrics"];
}

export function SecurityMetrics({ data }: SecurityMetricsProps) {
  if (!data) return null;

  const chartData = [
    {
      name: "Threats",
      value: data.threatsBlocked,
      icon: Shield,
      color: "text-purple-500",
    },
    {
      name: "Vulnerabilities",
      value: data.vulnerabilitiesFound,
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      name: "Scans",
      value: data.scanCount,
      icon: Search,
      color: "text-blue-500",
    },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Security Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricsChart data={chartData} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">
                  Last Scan Duration
                </span>
              </div>
              <p className="text-2xl font-bold text-white">
                {data.lastScanDuration.toFixed(1)}s
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
