"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Files, Clock, Database } from "lucide-react";
import { MetricsChart } from "./MetricsChart";
import type { Analytics } from "@/types";
import { formatBytes, formatDate } from "@/lib/utils";

interface VaultMetricsProps {
  data?: Analytics["vaultMetrics"];
}

export function VaultMetrics({ data }: VaultMetricsProps) {
  if (!data) return null;

  const chartData = [
    {
      name: "Items",
      value: data.totalItems,
      icon: Files,
      color: "text-purple-500",
    },
    {
      name: "Storage",
      value: data.storageUsed / 1024 / 1024, // Convert to MB
      icon: Database,
      color: "text-blue-500",
      format: (value: number) => `${value.toFixed(1)} MB`,
    },
    {
      name: "Access",
      value: data.accessCount,
      icon: Lock,
      color: "text-green-500",
    },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Vault Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricsChart data={chartData} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Last Backup</span>
              </div>
              <p className="text-lg font-medium text-white">
                {formatDate(data.lastBackup)}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Storage Usage</span>
              </div>
              <p className="text-lg font-medium text-white">
                {formatBytes(data.storageUsed)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
