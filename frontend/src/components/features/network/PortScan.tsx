"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

interface PortScanResult {
  port: number;
  status: "open" | "closed" | "filtered" | "blacklisted" | "whitelisted";
  service: string;
  description: string;
  risk: "low" | "medium" | "high";
  version: string;
  additionalInfo: {
    protocol: string;
    state: string;
    reason: string;
  };
}

interface SystemInfo {
  platform: string;
  release: string;
  hostname: string;
}

interface ScanMetrics {
  duration: number;
  totalPorts: number;
  openPorts: number;
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

export function PortScan() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PortScanResult[]>([]);
  const [metrics, setMetrics] = useState<ScanMetrics | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [portRange, setPortRange] = useState("");
  const { toast } = useToast();

  const validatePortRange = (range: string): boolean => {
    if (!range) return true; // Empty is valid (will scan all ports)
    const parts = range.split("-");
    if (parts.length !== 2) return false;
    const [start, end] = parts.map(Number);
    return (
      !isNaN(start) && !isNaN(end) && start >= 0 && end <= 65535 && start < end
    );
  };

  const handleScan = async () => {
    if (portRange && !validatePortRange(portRange)) {
      toast({
        title: "Invalid port range",
        description:
          "Please enter a valid port range (e.g., 1024-2000) or leave empty to scan all ports",
        variant: "destructive",
      });
      return;
    }

    try {
      setScanning(true);
      setResults([]);
      setMetrics(null);
      setSystemInfo(null);
      setScanProgress(0);

      const scanStartTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - scanStartTime;
        const estimatedProgress = Math.min(
          99,
          Math.floor((elapsed / 300000) * 100)
        );
        setScanProgress(estimatedProgress);
      }, 1000);

      const response = await fetch("/api/scan/ports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: "127.0.0.1",
          ports: portRange || "1-65535",
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to perform port scan");
      }

      setResults(data.data.results[0]?.openPorts || []);
      setMetrics(data.data.metrics);
      setSystemInfo(data.data.systemInfo);
      setScanProgress(100);

      toast({
        title: "Port scan completed",
        description: `Found ${data.data.metrics.openPorts} open ports out of ${data.data.metrics.totalPorts} scanned`,
      });
    } catch (error) {
      console.error("Error during port scan:", error);
      toast({
        title: "Scan failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to perform port scan",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "blacklisted":
        return "bg-red-500/10 text-red-500";
      case "whitelisted":
        return "bg-green-500/10 text-green-500";
      case "open":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Port Scanner</CardTitle>
          {systemInfo && (
            <p className="text-sm text-gray-400 mt-1">
              {systemInfo.hostname} ({systemInfo.platform} {systemInfo.release})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Port range (e.g., 1024-2000)"
            value={portRange}
            onChange={(e) => setPortRange(e.target.value)}
            className="w-48 bg-gray-900/50 border-gray-700 text-white"
          />
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning... {scanProgress}%
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {portRange ? "Scan Range" : "Scan All"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {metrics && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg bg-gray-900/50 p-3">
                <p className="text-sm text-gray-400">Total Ports</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.totalPorts}
                </p>
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3">
                <p className="text-sm text-gray-400">Open Ports</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.openPorts}
                </p>
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3">
                <p className="text-sm text-gray-400">Scan Duration</p>
                <p className="text-2xl font-bold text-white">
                  {(metrics.duration / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="rounded-lg bg-gray-900/50 p-3">
                <p className="text-sm text-gray-400">Risk Breakdown</p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-red-500/10 text-red-500">
                    High: {metrics.riskBreakdown.high}
                  </Badge>
                  <Badge className="bg-yellow-500/10 text-yellow-500">
                    Med: {metrics.riskBreakdown.medium}
                  </Badge>
                  <Badge className="bg-green-500/10 text-green-500">
                    Low: {metrics.riskBreakdown.low}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                    Port
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                    Service
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                    Risk
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700 last:border-0"
                  >
                    <td className="px-4 py-2 text-sm text-white">
                      {result.port}
                    </td>
                    <td className="px-4 py-2 text-sm text-white">
                      <div className="flex items-center gap-2">
                        {result.service}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{result.description}</p>
                              {result.version && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Version: {result.version}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center">
                        <AlertTriangle
                          className={`mr-1 h-4 w-4 ${getRiskColor(
                            result.risk
                          )}`}
                        />
                        <span className={getRiskColor(result.risk)}>
                          {result.risk}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-400">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p>Protocol: {result.additionalInfo.protocol}</p>
                              <p>State: {result.additionalInfo.state}</p>
                              <p>Reason: {result.additionalInfo.reason}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && !scanning && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      No ports scanned yet. Click "Scan All Ports" to start.
                    </td>
                  </tr>
                )}
                {scanning && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-400"
                    >
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-500" />
                      <p className="mt-2">Scanning all 65,535 ports...</p>
                      <p className="text-xs">This may take a few minutes</p>
                      <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
