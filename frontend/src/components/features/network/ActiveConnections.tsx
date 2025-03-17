"use client";

import { useApi } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface Connection {
  source: string;
  sourcePort: number;
  destination: string;
  destinationPort: number;
  protocol: number;
  flags: string;
  lastSeen: string;
}

export function ActiveConnections() {
  const { data: trafficData, isLoading } = useApi<{
    success: boolean;
    data: {
      packets: Packet[];
    };
  }>("/network/traffic", 5000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Process packets to get unique connections
  const connections = processConnections(trafficData?.data?.packets || []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
        <div>Active Network Connections</div>
        <div className="text-xs">Showing recent network activity</div>
      </div>

      <div className="rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-300">
                Source
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-300">
                Destination
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-300">
                Protocol
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-300">
                Flags
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-300">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {connections.map((conn, index) => (
              <tr key={index} className="hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {conn.source}
                    </span>
                    <span className="text-xs text-gray-400">
                      :{conn.sourcePort}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {conn.destination}
                    </span>
                    <span className="text-xs text-gray-400">
                      :{conn.destinationPort}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default" className="text-xs">
                    {getProtocolName(conn.protocol)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {conn.protocol === 6 &&
                      conn.flags.split("").map((flag, i) => (
                        <TooltipProvider key={i}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant={flag === "1" ? "default" : "secondary"}
                                className="text-xs px-1.5"
                              >
                                {getTcpFlagName(i)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getTcpFlagDescription(i)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    {conn.protocol !== 6 && (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {formatDateTime(conn.lastSeen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!connections || connections.length === 0) && (
          <div className="text-center py-8 text-gray-400">
            No active connections
          </div>
        )}
      </div>
    </div>
  );
}

function getTcpFlagName(index: number): string {
  const flags = ["FIN", "SYN", "RST", "PSH", "ACK", "URG"];
  return flags[index] || `Flag${index}`;
}

function getTcpFlagDescription(index: number): string {
  const descriptions = {
    0: "FIN - Connection finish",
    1: "SYN - Synchronize sequence numbers",
    2: "RST - Reset connection",
    3: "PSH - Push buffered data",
    4: "ACK - Acknowledgment",
    5: "URG - Urgent pointer",
  };
  return descriptions[index as keyof typeof descriptions] || "Unknown flag";
}

function processConnections(packets: Packet[]): Connection[] {
  const connections = new Map<string, Connection>();

  packets.forEach((packet) => {
    const key = `${packet.source}:${packet.sport}-${packet.destination}:${packet.dport}-${packet.protocol}`;

    if (!connections.has(key)) {
      connections.set(key, {
        source: packet.source,
        sourcePort: packet.sport,
        destination: packet.destination,
        destinationPort: packet.dport,
        protocol: packet.protocol,
        flags: packet.flags || "000000",
        lastSeen: packet.timestamp,
      });
    } else {
      const conn = connections.get(key)!;
      conn.lastSeen = packet.timestamp;
      if (packet.flags) {
        conn.flags = packet.flags;
      }
    }
  });

  return Array.from(connections.values()).sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
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
      return `Protocol ${protocol}`;
  }
}
