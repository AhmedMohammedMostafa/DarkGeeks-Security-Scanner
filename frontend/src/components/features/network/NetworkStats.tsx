"use client";

import { useEffect, useState } from "react";
import { Network, Activity, Users, Shield } from "lucide-react";

interface NetworkStats {
  totalPackets: number;
  totalBytes: number;
  activeConnections: number;
  blockedAttempts: number;
  protocolDistribution: Record<string, number>;
  topSourceIPs: Array<{ ip: string; count: number }>;
  topDestinationIPs: Array<{ ip: string; count: number }>;
}

export function NetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/network/stats");
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Error fetching network stats:", error);
      }
    };

    // Fetch initial stats
    fetchStats();

    // Set up polling every 5 seconds
    const interval = setInterval(fetchStats, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div className="text-gray-400">Loading network statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <Network className="h-5 w-5 text-purple-500" />
          <div>
            <p className="text-sm text-gray-400">Total Packets</p>
            <p className="text-lg font-semibold text-white">
              {stats.totalPackets.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Activity className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm text-gray-400">Total Bytes</p>
            <p className="text-lg font-semibold text-white">
              {(stats.totalBytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Users className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm text-gray-400">Active Connections</p>
            <p className="text-lg font-semibold text-white">
              {stats.activeConnections}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Shield className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm text-gray-400">Blocked Attempts</p>
            <p className="text-lg font-semibold text-white">
              {stats.blockedAttempts}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Protocol Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.protocolDistribution).map(
              ([protocol, count]) => (
                <div
                  key={protocol}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-gray-300">{protocol}</span>
                  <span className="text-sm text-gray-400">{count}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Top Source IPs
          </h3>
          <div className="space-y-2">
            {stats.topSourceIPs.map(({ ip, count }) => (
              <div key={ip} className="flex justify-between items-center">
                <span className="text-sm text-gray-300">{ip}</span>
                <span className="text-sm text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Top Destination IPs
          </h3>
          <div className="space-y-2">
            {stats.topDestinationIPs.map(({ ip, count }) => (
              <div key={ip} className="flex justify-between items-center">
                <span className="text-sm text-gray-300">{ip}</span>
                <span className="text-sm text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
