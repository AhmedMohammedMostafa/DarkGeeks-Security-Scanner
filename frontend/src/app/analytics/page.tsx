"use client";

import { useApi } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Activity, Lock, Shield } from "lucide-react";
import { MetricsChart } from "@/components/features/analytics/MetricsChart";
import { SecurityMetrics } from "@/components/features/analytics/SecurityMetrics";
import { NetworkMetrics } from "@/components/features/analytics/NetworkMetrics";
import { VaultMetrics } from "@/components/features/analytics/VaultMetrics";
import { SystemMetrics } from "@/components/features/analytics/SystemMetrics";
import type { Analytics } from "@/types";
import { formatBytes, formatNumber } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useApi<Analytics>("/analytics", 10000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-gray-400">
          Monitor system performance and security metrics
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Security Score
            </CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics?.securityMetrics.threatsBlocked} threats blocked
            </div>
            <p className="text-xs text-gray-400">
              Last scan:{" "}
              {formatNumber(analytics?.securityMetrics.scanCount || 0)} scans
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Network Traffic
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatBytes(analytics?.networkMetrics.totalTraffic || 0)}
            </div>
            <p className="text-xs text-gray-400">
              {analytics?.networkMetrics.anomaliesDetected} anomalies detected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Vault Usage
            </CardTitle>
            <Lock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics?.vaultMetrics.totalItems} items
            </div>
            <p className="text-xs text-gray-400">
              {formatBytes(analytics?.vaultMetrics.storageUsed || 0)} used
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              System Load
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics?.systemMetrics.cpuUsage.toFixed(1)}% CPU
            </div>
            <p className="text-xs text-gray-400">
              {analytics?.systemMetrics.memoryUsage.toFixed(1)}% Memory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityMetrics data={analytics?.securityMetrics} />
        <NetworkMetrics data={analytics?.networkMetrics} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VaultMetrics data={analytics?.vaultMetrics} />
        <SystemMetrics data={analytics?.systemMetrics} />
      </div>
    </div>
  );
}
