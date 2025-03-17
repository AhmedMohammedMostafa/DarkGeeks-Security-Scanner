"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/utils";
import { Activity, AlertTriangle, Lock, Radio } from "lucide-react";

interface PortStats {
  totalScanned: number;
  openPorts: number;
  vulnerabilities: number;
  lastScan: string | null;
  commonPorts: Array<{ port: number; service: string; count: number }>;
  recentFindings: Array<{
    port: number;
    service: string;
    risk: string;
    details: string;
  }>;
  portHistory: Array<{
    timestamp: string;
    openPorts: number;
    closedPorts: number;
  }>;
}

export default function PortDashboardPage() {
  const [stats, setStats] = useState<PortStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/network/scan/stats");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch stats");
      }
      setStats(result.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch port scan statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickScan = async () => {
    try {
      const response = await fetch("/api/network/scan", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to start scan");
      }
      toast({
        title: "Success",
        description: "Port scan initiated successfully",
      });
      // Refresh stats after a short delay
      setTimeout(fetchStats, 2000);
    } catch (error) {
      console.error("Error starting scan:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to start port scan",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Port Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and analyze port activity
          </p>
        </div>
        <Button onClick={handleQuickScan}>Quick Scan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Scanned
              </p>
              <h2 className="text-2xl font-bold">{stats?.totalScanned || 0}</h2>
            </div>
            <Radio className="h-4 w-4 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Open Ports
              </p>
              <h2 className="text-2xl font-bold">{stats?.openPorts || 0}</h2>
            </div>
            <Lock className="h-4 w-4 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Vulnerabilities
              </p>
              <h2 className="text-2xl font-bold">
                {stats?.vulnerabilities || 0}
              </h2>
            </div>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Scan
              </p>
              <h2 className="text-sm font-medium">
                {stats?.lastScan ? formatDateTime(stats.lastScan) : "Never"}
              </h2>
            </div>
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Common Ports</h3>
          <div className="space-y-4">
            {stats?.commonPorts?.map((port, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Port {port.port}</p>
                  <p className="text-sm text-muted-foreground">
                    {port.service}
                  </p>
                </div>
                <span className="text-sm font-medium">{port.count} hits</span>
              </div>
            )) || <p className="text-muted-foreground">No data available</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Findings</h3>
          <div className="space-y-4">
            {stats?.recentFindings?.map((finding, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Port {finding.port} ({finding.service})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {finding.details}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    finding.risk === "high"
                      ? "text-destructive"
                      : finding.risk === "medium"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {finding.risk}
                </span>
              </div>
            )) || (
              <p className="text-muted-foreground">No findings available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
