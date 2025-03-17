"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScanResult {
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
}

interface CodeScanResponse {
  scanResult: ScanResult | null;
  aiAnalysis: string | null;
  timestamp: string;
}

export function CodeScanner() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<CodeScanResponse | null>(null);

  const handleScan = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to scan");
      return;
    }

    setScanning(true);
    try {
      const response = await fetch("/api/security/scan-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          filename: filename || "temp_code.txt",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setScanResults(data.data);
        toast.success("Code scan completed successfully");
      } else {
        throw new Error(data.error || "Failed to scan code");
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to scan code"
      );
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "text-red-500 bg-red-500/20";
      case "high":
        return "text-orange-500 bg-orange-500/20";
      case "medium":
        return "text-yellow-500 bg-yellow-500/20";
      case "low":
        return "text-blue-500 bg-blue-500/20";
      default:
        return "text-gray-500 bg-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            Custom Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Filename (optional)"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-gray-800/30 border-gray-700 text-white"
            />
            <Textarea
              placeholder="Paste your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[200px] font-mono bg-gray-800/30 border-gray-700 text-white"
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning || !code.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Scan Code
              </>
            )}
          </Button>

          {scanResults && (
            <div className="space-y-4 mt-6">
              {/* Scan Results */}
              {scanResults.scanResult && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    Security Scan Results
                  </h3>
                  <div
                    className={`p-4 rounded-lg border ${
                      scanResults.scanResult.severity === "critical"
                        ? "bg-red-950/20 border-red-900/50"
                        : scanResults.scanResult.severity === "high"
                        ? "bg-orange-950/20 border-orange-900/50"
                        : "bg-blue-950/20 border-blue-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-white">
                        {scanResults.scanResult.type}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(
                          scanResults.scanResult.severity
                        )}`}
                      >
                        {scanResults.scanResult.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Detection Method:{" "}
                        {scanResults.scanResult.detectionMethod}
                      </p>
                      <p>Details: {scanResults.scanResult.details}</p>
                      <p>File Hash: {scanResults.scanResult.hash}</p>
                      <p>MD5 Hash: {scanResults.scanResult.md5Hash}</p>
                      <p>
                        Entropy: {scanResults.scanResult.entropy.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {scanResults.aiAnalysis && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    AI Security Analysis
                  </h3>
                  <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                      {scanResults.aiAnalysis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
