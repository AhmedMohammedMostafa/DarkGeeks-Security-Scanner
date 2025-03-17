"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Activity,
  Lock,
  AlertTriangle,
  Loader2,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  FileSearch,
  FolderOpen,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime, formatBytes, formatDuration } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SecurityStatus {
  malwareProtection: {
    status: "active" | "inactive";
    lastScan: string;
    threats: number;
  };
  firewall: {
    status: "enabled" | "disabled";
    connections: number;
    blocked: number;
  };
  activeThreats: {
    count: number;
    severity: "low" | "medium" | "high" | "critical";
  };
  encryption: {
    status: "active" | "inactive";
    type: string;
    strength: string;
  };
}

interface SuspiciousProcess {
  name: string;
  pid: number;
  path: string;
  hash: string;
  signedBy?: string;
  memoryUsage: number;
  cpuUsage: number;
  startTime: string;
  commandLine: string;
}

interface ScanResult {
  scanDuration: number;
  threats: number;
  findings: Array<{
    path: string;
    type: string;
    severity: string;
    details: string;
    hash: string;
    md5Hash: string;
    detectionMethod: string;
    size: number;
    timestamp: string;
    entropy: number;
  }>;
  systemStatus: {
    suspiciousProcesses: SuspiciousProcess[];
    scannedFiles: number;
    scannedDirectories: number;
    timestamp: string;
    scanPath: string;
    systemInfo: {
      cpu: {
        manufacturer: string;
        brand: string;
        speed: number;
        cores: number;
        physicalCores: number;
      };
      memory: {
        total: number;
        free: number;
        used: number;
        swapTotal: number;
        swapUsed: number;
      };
      os: {
        platform: string;
        distro: string;
        release: string;
        arch: string;
      };
    };
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
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanPath, setScanPath] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchSecurityStatus = async () => {
    try {
      const response = await fetch("/api/security/status");
      if (!response.ok) {
        throw new Error("Failed to fetch security status");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch security status");
      }
      setStatus(result.data);
    } catch (error) {
      console.error("Error fetching security status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch security status",
        variant: "destructive",
      });
    }
  };

  const handleMalwareScan = async () => {
    if (scanning) return;

    setScanning(true);
    try {
      const response = await fetch("/api/security/malware-scan", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setScanResult(data.data);
        toast({
          title: "Success",
          description: "Malware scan completed successfully",
        });
        await fetchSecurityStatus();
      } else {
        throw new Error(data.error || "Failed to perform malware scan");
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to perform malware scan",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Security Status</h1>
          <p className="text-gray-400">
            Monitor your system&apos;s security in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleMalwareScan()}
            disabled={scanning}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Quick Scan
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Malware Protection Card */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Malware Protection
            </CardTitle>
            <Shield
              className={
                status.malwareProtection.status === "active"
                  ? "text-green-500"
                  : "text-red-500"
              }
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {status.malwareProtection.status === "active"
                ? "Protected"
                : "At Risk"}
            </div>
            <p className="text-xs text-gray-400">
              Last scan:{" "}
              {status.malwareProtection.lastScan
                ? formatDateTime(status.malwareProtection.lastScan)
                : "Never"}
              <br />
              Threats found: {status.malwareProtection.threats}
            </p>
          </CardContent>
        </Card>

        {/* Firewall Card */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Firewall Status
            </CardTitle>
            <Activity
              className={
                status.firewall.status === "enabled"
                  ? "text-green-500"
                  : "text-red-500"
              }
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {status.firewall.status === "enabled" ? "Enabled" : "Disabled"}
            </div>
            <p className="text-xs text-gray-400">
              Blocked: {status.firewall.blocked} connections
            </p>
          </CardContent>
        </Card>

        {/* Active Threats Card */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Threats
            </CardTitle>
            <AlertTriangle
              className={`${getSeverityColor(status.activeThreats.severity)}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {status.activeThreats.count} threats
            </div>
            <p className="text-xs text-gray-400">
              Severity: {status.activeThreats.severity}
            </p>
          </CardContent>
        </Card>

        {/* Encryption Card */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Encryption
            </CardTitle>
            <Lock
              className={
                status.encryption.status === "active"
                  ? "text-green-500"
                  : "text-red-500"
              }
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {status.encryption.status === "active"
                ? status.encryption.type
                : "Inactive"}
            </div>
            <p className="text-xs text-gray-400">
              {status.encryption.status === "active"
                ? status.encryption.strength
                : "No encryption"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Scan Results</h2>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Scan Duration
                </CardTitle>
                <Clock className="text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatDuration(scanResult.scanDuration)}
                </div>
                <p className="text-xs text-gray-400">
                  Completed: {formatDateTime(scanResult.systemStatus.timestamp)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Files Scanned
                </CardTitle>
                <FileSearch className="text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {scanResult.systemStatus.scannedFiles.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">
                  Directories:{" "}
                  {scanResult.systemStatus.scannedDirectories.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Threats Found
                </CardTitle>
                <AlertTriangle className="text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {scanResult.threats}
                </div>
                <p className="text-xs text-gray-400">
                  Known threats: {scanResult.scanStats.knownThreats.length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Largest File
                </CardTitle>
                <HardDrive className="text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatBytes(scanResult.scanStats.largestFile.size)}
                </div>
                <p
                  className="text-xs text-gray-400 truncate"
                  title={scanResult.scanStats.largestFile.path}
                >
                  {scanResult.scanStats.largestFile.path.split("\\").pop()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  CPU Information
                </CardTitle>
                <Cpu className="text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-400">Processor</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.cpu.brand}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Cores</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.cpu.physicalCores}{" "}
                      Physical / {scanResult.systemStatus.systemInfo.cpu.cores}{" "}
                      Logical
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Speed</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.cpu.speed} GHz
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Memory Status
                </CardTitle>
                <MemoryStick className="text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-400">Total Memory</div>
                    <div className="text-white">
                      {formatBytes(
                        scanResult.systemStatus.systemInfo.memory.total
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Used Memory</div>
                    <div className="text-white">
                      {formatBytes(
                        scanResult.systemStatus.systemInfo.memory.used
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Free Memory</div>
                    <div className="text-white">
                      {formatBytes(
                        scanResult.systemStatus.systemInfo.memory.free
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  Operating System
                </CardTitle>
                <Shield className="text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-400">System</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.os.distro}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Version</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.os.release}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Architecture</div>
                    <div className="text-white">
                      {scanResult.systemStatus.systemInfo.os.arch}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Findings Table */}
          {scanResult.findings.length > 0 && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Security Findings
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Detection Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scanResult.findings.map((finding, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              finding.severity === "high"
                                ? "bg-red-500/10 text-red-500"
                                : finding.severity === "medium"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}
                          >
                            {finding.severity}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {finding.type}
                        </TableCell>
                        <TableCell
                          className="text-gray-300 max-w-xs truncate"
                          title={finding.path}
                        >
                          {finding.path.split("\\").pop()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {finding.details}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatBytes(finding.size)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {finding.detectionMethod}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
