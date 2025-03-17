"use client";

import { useApi } from "@/hooks/useApi";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { Loader2, Network, Activity, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Packet {
  timestamp: string;
  source: string;
  destination: string;
  protocol: number;
  length: number;
  ttl: number;
  sport: number;
  dport: number;
  flags: string;
}

interface TopTalker {
  ip: string;
  bytes: number;
  packets: number;
  protocols: Set<number>;
  lastSeen: string;
  connections: number;
}

export function TopTalkers() {
  const { data: trafficData, isLoading } = useApi<{
    success: boolean;
    data: {
      packets: Packet[];
    };
  }>("/network/traffic", 5000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Process packets to get top talkers
  const topTalkers = processTopTalkers(trafficData?.data?.packets || []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-300 mb-4">
        <div>Most Active Network Endpoints</div>
        <div className="text-xs">Showing top 10 by traffic volume</div>
      </div>

      <div className="space-y-3">
        {topTalkers.map((talker, index) => (
          <div
            key={talker.ip}
            className="group relative p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-800/50 transition-all duration-300 ease-in-out"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors duration-300">
                  <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300">
                    #{index + 1}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white">
                      {talker.ip}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                    >
                      {Array.from(talker.protocols)
                        .map(getProtocolName)
                        .join(", ")}
                    </Badge>
                  </div>
                  <div className="flex space-x-4 text-xs text-gray-400">
                    <div className="flex items-center group-hover:text-purple-400 transition-colors">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      <span>{talker.connections} connections</span>
                    </div>
                    <div className="flex items-center group-hover:text-purple-400 transition-colors">
                      <Activity className="h-3.5 w-3.5 mr-1.5" />
                      <span>{formatBytes(talker.bytes)}</span>
                    </div>
                    <div className="flex items-center group-hover:text-purple-400 transition-colors">
                      <Network className="h-3.5 w-3.5 mr-1.5" />
                      <span>{talker.packets} packets</span>
                    </div>
                    <div className="flex items-center group-hover:text-purple-400 transition-colors">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      <span>Last seen: {formatDateTime(talker.lastSeen)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <div
                  className="h-2 w-32 rounded-full bg-gray-700/50 overflow-hidden"
                  title={`${formatBytes(talker.bytes)}`}
                >
                  <div
                    className="h-full bg-purple-500/50 group-hover:bg-purple-500 transition-colors duration-300"
                    style={{
                      width: `${
                        (talker.bytes / (topTalkers[0]?.bytes || 1)) * 100
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 group-hover:text-purple-400 transition-colors">
                  {((talker.bytes / (topTalkers[0]?.bytes || 1)) * 100).toFixed(
                    1
                  )}
                  % of peak
                </span>
              </div>
            </div>
          </div>
        ))}

        {(!topTalkers || topTalkers.length === 0) && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p>No active network talkers</p>
          </div>
        )}
      </div>
    </div>
  );
}

function processTopTalkers(packets: Packet[]): TopTalker[] {
  const ipStats = new Map<
    string,
    {
      bytes: number;
      packets: number;
      protocols: Set<number>;
      lastSeen: string;
      connections: Set<string>;
    }
  >();

  packets.forEach((packet) => {
    // Process source IP
    if (!ipStats.has(packet.source)) {
      ipStats.set(packet.source, {
        bytes: 0,
        packets: 0,
        protocols: new Set(),
        lastSeen: packet.timestamp,
        connections: new Set(),
      });
    }
    const sourceStats = ipStats.get(packet.source)!;
    sourceStats.bytes += packet.length;
    sourceStats.packets += 1;
    sourceStats.protocols.add(packet.protocol);
    sourceStats.lastSeen = packet.timestamp;
    sourceStats.connections.add(`${packet.destination}:${packet.dport}`);

    // Process destination IP
    if (!ipStats.has(packet.destination)) {
      ipStats.set(packet.destination, {
        bytes: 0,
        packets: 0,
        protocols: new Set(),
        lastSeen: packet.timestamp,
        connections: new Set(),
      });
    }
    const destStats = ipStats.get(packet.destination)!;
    destStats.bytes += packet.length;
    destStats.packets += 1;
    destStats.protocols.add(packet.protocol);
    destStats.lastSeen = packet.timestamp;
    destStats.connections.add(`${packet.source}:${packet.sport}`);
  });

  return Array.from(ipStats.entries())
    .map(([ip, stats]) => ({
      ip,
      bytes: stats.bytes,
      packets: stats.packets,
      protocols: stats.protocols,
      lastSeen: stats.lastSeen,
      connections: stats.connections.size,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);
}

function getProtocolName(protocol: number): string {
  switch (protocol) {
    case 1:
      return "ICMP";
    case 6:
      return "TCP";
    case 17:
      return "UDP";
    default:
      return `${protocol}`;
  }
}
