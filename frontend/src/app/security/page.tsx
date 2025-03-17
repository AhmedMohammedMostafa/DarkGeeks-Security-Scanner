"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanHistory } from "@/components/features/security/ScanHistory";
import { CodeScanner } from "@/components/features/security/CodeScanner";
import { useToast } from "@/components/ui/use-toast";
import { Clock, FileText, AlertTriangle, Loader2, Shield } from "lucide-react";
import { formatNumber, formatDuration } from "@/lib/utils";

interface ScanResult {
  scanDuration: number;
  threats: number;
  findings: Array<{
    path: string;
    type: string;
    severity: string;
    details: string;
    hash: string;
    signatureMatch?: string;
    detectionMethod: string;
    timestamp: string;
  }>;
  systemStatus: {
    suspiciousProcesses: Array<{
      name: string;
      pid: number;
      path: string;
      hash: string;
      signedBy?: string;
      memoryUsage: number;
      cpuUsage: number;
      startTime: string;
      commandLine: string;
    }>;
    scannedFiles: number;
    scannedDirectories: number;
    timestamp: string;
    scanPath: string;
    customScans: Array<{
      path: string;
      result: string;
      aiAnalysis?: string;
      timestamp: string;
    }>;
  };
  scanStats: {
    totalFiles: number;
    skippedFiles: number;
    fileTypes: Record<string, number>;
    averageScanTime: number;
    largestFile: {
      path: string;
      size: number;
    };
    malwareHashes: string[];
    knownThreats: string[];
  };
}

export default function SecurityPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const { toast } = useToast();

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/security/malware-scan");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to perform malware scan");
      }

      setLastScan(data.data);

      // Get previous scans from localStorage
      const previousScans = JSON.parse(
        localStorage.getItem("scanHistory") || "[]"
      );

      // Add new scan to history, keeping only last 10 scans
      const updatedScans = [data.data, ...previousScans].slice(0, 10);
      localStorage.setItem("scanHistory", JSON.stringify(updatedScans));

      toast({
        title: "Scan Complete",
        description: `Found ${formatNumber(
          data.data.threats
        )} potential threats in ${formatDuration(data.data.scanDuration)}`,
      });
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during the scan",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Security Status</h1>
        <p className="text-gray-400">
          Monitor your system's security in real-time
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Scan Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {lastScan ? formatDuration(lastScan.scanDuration) : "N/A"}
            </div>
            <p className="text-xs text-gray-400">Last scan duration</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Files Scanned
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {lastScan
                ? formatNumber(lastScan.systemStatus.scannedFiles)
                : "N/A"}
            </div>
            <p className="text-xs text-gray-400">Total files analyzed</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Threats Found
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {lastScan ? formatNumber(lastScan.threats) : "N/A"}
            </div>
            <p className="text-xs text-gray-400">Potential security threats</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Suspicious Processes
            </CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {lastScan
                ? formatNumber(lastScan.systemStatus.suspiciousProcesses.length)
                : "N/A"}
            </div>
            <p className="text-xs text-gray-400">Active suspicious processes</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleScan}
          disabled={isScanning}
          className="w-[200px]"
        >
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Start Scan
            </>
          )}
        </Button>
      </div>

      <ScanHistory />
      <CodeScanner />
    </div>
  );
}
