"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Shield, Activity } from "lucide-react";

interface Anomaly {
  id: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  sourceIP: string;
  destinationIP: string;
  protocol: string;
  port: number;
  status: "active" | "resolved" | "dismissed";
}

export function AnomalyList() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const response = await fetch("/api/network/anomalies");
        const result = await response.json();
        if (result.success) {
          setAnomalies(result.data);
        }
      } catch (error) {
        console.error("Error fetching anomalies:", error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial anomalies
    fetchAnomalies();

    // Set up polling every 10 seconds
    const interval = setInterval(fetchAnomalies, 10000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusColor = (status: Anomaly["status"]) => {
    switch (status) {
      case "active":
        return "text-red-500";
      case "resolved":
        return "text-green-500";
      case "dismissed":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading anomalies...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Detected Anomalies</h3>
        <span className="text-sm text-gray-400">
          {anomalies.length} {anomalies.length === 1 ? "anomaly" : "anomalies"}
        </span>
      </div>

      <div className="space-y-4">
        {anomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle
                  className={`h-5 w-5 ${getSeverityColor(anomaly.severity)}`}
                />
                <div>
                  <h4 className="text-sm font-medium text-white">
                    {anomaly.type}
                  </h4>
                  <p className="text-xs text-gray-400">{anomaly.description}</p>
                </div>
              </div>
              <span
                className={`text-xs font-medium ${getStatusColor(
                  anomaly.status
                )}`}
              >
                {anomaly.status.toUpperCase()}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-400">
                  {new Date(anomaly.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-gray-400">
                  {anomaly.protocol} : {anomaly.port}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-gray-400">
                  {anomaly.sourceIP} → {anomaly.destinationIP}
                </span>
              </div>
            </div>
          </div>
        ))}

        {anomalies.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No anomalies detected
          </div>
        )}
      </div>
    </div>
  );
}
