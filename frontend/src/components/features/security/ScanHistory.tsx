"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ScanResult {
  scanDuration: number;
  threats: number;
  findings: Array<{
    path: string;
    type: string;
    severity: string;
    details: string;
  }>;
  systemStatus: {
    suspiciousProcesses: Array<{
      name: string;
      pid: number;
    }>;
    scannedFiles: number;
    timestamp: string;
  };
}

export function ScanHistory() {
  const [history, setHistory] = useState<ScanResult[]>([]);

  useEffect(() => {
    // Load scan history from localStorage
    const savedHistory = localStorage.getItem("scanHistory");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          Scan History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Threats</TableHead>
                <TableHead>Files Scanned</TableHead>
                <TableHead>Suspicious Processes</TableHead>
                <TableHead>Findings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((scan, index) => (
                <TableRow key={index}>
                  <TableCell className="text-gray-300">
                    {formatDateTime(scan.systemStatus.timestamp)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {scan.scanDuration}s
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          scan.threats > 0 ? "text-red-500" : "text-green-500"
                        }`}
                      />
                      <span className="text-gray-300">{scan.threats}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {scan.systemStatus.scannedFiles}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {scan.systemStatus.suspiciousProcesses.length}
                  </TableCell>
                  <TableCell>
                    {scan.findings.map((finding, i) => (
                      <Badge
                        key={i}
                        variant={getSeverityColor(finding.severity)}
                        className="mr-1"
                      >
                        {finding.type}
                      </Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {history.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No scan history available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
