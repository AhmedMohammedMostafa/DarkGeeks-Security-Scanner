import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Shield } from "lucide-react";
import { io } from "socket.io-client";
import { formatDateTime } from "@/lib/utils";

interface PortActivity {
  port: number;
  type: "incoming" | "outgoing";
  protocol: "TCP" | "UDP";
  remoteAddress: string;
  timestamp: string;
  status: "open" | "closed" | "filtered";
}

export function PortMonitor() {
  const [activities, setActivities] = useState<PortActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000", {
      path: "/api/socket",
    });

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("port-activity", (activity: PortActivity) => {
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusColor = (status: PortActivity["status"]) => {
    switch (status) {
      case "open":
        return "text-green-500";
      case "filtered":
        return "text-yellow-500";
      case "closed":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          Real-time Port Activity
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <Badge variant={isConnected ? "success" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-md border border-gray-700">
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="p-2 text-left text-sm font-medium text-gray-400">
                      Time
                    </th>
                    <th className="p-2 text-left text-sm font-medium text-gray-400">
                      Port
                    </th>
                    <th className="p-2 text-left text-sm font-medium text-gray-400">
                      Type
                    </th>
                    <th className="p-2 text-left text-sm font-medium text-gray-400">
                      Remote
                    </th>
                    <th className="p-2 text-left text-sm font-medium text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-700 last:border-0"
                    >
                      <td className="p-2 text-sm text-gray-300">
                        {formatDateTime(activity.timestamp)}
                      </td>
                      <td className="p-2 text-sm text-gray-300">
                        {activity.port}
                      </td>
                      <td className="p-2 text-sm text-gray-300">
                        <Badge variant="secondary">
                          {activity.protocol} {activity.type}
                        </Badge>
                      </td>
                      <td className="p-2 text-sm text-gray-300">
                        {activity.remoteAddress}
                      </td>
                      <td className="p-2 text-sm">
                        <span className={getStatusColor(activity.status)}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
