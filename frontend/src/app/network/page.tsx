"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetworkTrafficChart } from "@/components/features/network/NetworkTrafficChart";
import { TopTalkers } from "@/components/features/network/TopTalkers";
import { ActiveConnections } from "@/components/features/network/ActiveConnections";
import { useApi } from "@/hooks/useApi";
import { io } from "socket.io-client";
import type { NetworkTraffic } from "@/types";
import {
  Activity,
  Network,
  Signal,
  Upload,
  Download,
  Zap,
  Shield,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

export default function NetworkPage() {
  const { data: traffic, mutate: refreshTraffic } = useApi<{
    success: boolean;
    data: {
      packets: Array<{
        timestamp: string;
        source: string;
        destination: string;
        protocol: number;
        length: number;
        ttl: number;
        sport: number;
        dport: number;
        flags: string;
      }>;
    };
  }>("/network/traffic", 1000);

  const [socket, setSocket] = useState<any>(null);
  const [stats, setStats] = useState({
    totalBytes: 0,
    activeConnections: 0,
    throughput: 0,
    protocols: new Set<number>(),
  });

  useEffect(() => {
    if (traffic?.data?.packets) {
      const packets = traffic.data.packets;
      const now = Date.now();
      const recentPackets = packets.filter(
        (p) => now - new Date(p.timestamp).getTime() < 60000
      );

      setStats({
        totalBytes: packets.reduce((sum, p) => sum + p.length, 0),
        activeConnections: new Set(
          recentPackets.map(
            (p) => `${p.source}:${p.sport}-${p.destination}:${p.dport}`
          )
        ).size,
        throughput: recentPackets.reduce((sum, p) => sum + p.length, 0) / 60,
        protocols: new Set(packets.map((p) => p.protocol)),
      });
    }
  }, [traffic]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      path: "/api/network/ws",
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("networkUpdate", (data) => {
      refreshTraffic();
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Network Monitor</h1>
        <p className="text-gray-400">
          Real-time network traffic analysis and monitoring
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl hover:bg-gray-900/60 transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Traffic
                </p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {formatBytes(stats.totalBytes)}
                </h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl hover:bg-gray-900/60 transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Active Connections
                </p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.activeConnections}
                </h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Network className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl hover:bg-gray-900/60 transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Current Throughput
                </p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {formatBytes(stats.throughput)}/s
                </h3>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl hover:bg-gray-900/60 transition-colors">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Active Protocols
                </p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.protocols.size}
                </h3>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl">
          <CardHeader className="border-b border-gray-800/50">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              Network Traffic
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <NetworkTrafficChart />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl">
          <CardHeader className="border-b border-gray-800/50">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Network className="h-5 w-5 text-purple-400" />
              Top Talkers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <TopTalkers />
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800/50 backdrop-blur-lg shadow-xl">
          <CardHeader className="border-b border-gray-800/50">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Signal className="h-5 w-5 text-purple-400" />
              Active Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ActiveConnections />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
