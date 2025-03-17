import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PortList {
  ports: number[];
  ranges: string[];
}

export function PortLists() {
  const [whitelist, setWhitelist] = useState<PortList>({
    ports: [],
    ranges: [],
  });
  const [blacklist, setBlacklist] = useState<PortList>({
    ports: [],
    ranges: [],
  });
  const [loading, setLoading] = useState(true);
  const [newWhitelistPort, setNewWhitelistPort] = useState("");
  const [newBlacklistPort, setNewBlacklistPort] = useState("");
  const [newWhitelistRange, setNewWhitelistRange] = useState("");
  const [newBlacklistRange, setNewBlacklistRange] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const [whitelistRes, blacklistRes] = await Promise.all([
        fetch("/api/network/whitelist"),
        fetch("/api/network/blacklist"),
      ]);

      const [whitelistData, blacklistData] = await Promise.all([
        whitelistRes.json(),
        blacklistRes.json(),
      ]);

      if (whitelistData.success) {
        setWhitelist(whitelistData.data);
      }
      if (blacklistData.success) {
        setBlacklist(blacklistData.data);
      }
    } catch (error) {
      console.error("Error fetching port lists:", error);
      toast({
        title: "Error",
        description: "Failed to fetch port lists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePort = (port: string): boolean => {
    const num = parseInt(port);
    return !isNaN(num) && num >= 0 && num <= 65535;
  };

  const validatePortRange = (range: string): boolean => {
    const parts = range.split("-");
    if (parts.length !== 2) return false;
    const [start, end] = parts.map(Number);
    return (
      !isNaN(start) && !isNaN(end) && start >= 0 && end <= 65535 && start < end
    );
  };

  const addToList = async (
    type: "whitelist" | "blacklist",
    value: string,
    isRange: boolean
  ) => {
    if (isRange && !validatePortRange(value)) {
      toast({
        title: "Invalid port range",
        description: "Please enter a valid port range (e.g., 1024-2000)",
        variant: "destructive",
      });
      return;
    }

    if (!isRange && !validatePort(value)) {
      toast({
        title: "Invalid port",
        description: "Please enter a valid port number (0-65535)",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/network/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [isRange ? "range" : "port"]: isRange ? value : parseInt(value),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchLists();
        toast({
          title: "Success",
          description: `Port ${isRange ? "range" : ""} added to ${type}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(`Error adding to ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to add port ${isRange ? "range" : ""} to ${type}`,
        variant: "destructive",
      });
    }

    // Clear input
    if (type === "whitelist") {
      isRange ? setNewWhitelistRange("") : setNewWhitelistPort("");
    } else {
      isRange ? setNewBlacklistRange("") : setNewBlacklistPort("");
    }
  };

  const removeFromList = async (
    type: "whitelist" | "blacklist",
    value: string | number,
    isRange: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/network/${type}/${isRange ? "range" : "port"}/${value}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchLists();
        toast({
          title: "Success",
          description: `${isRange ? "Range" : "Port"} removed from ${type}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(`Error removing from ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to remove ${
          isRange ? "range" : "port"
        } from ${type}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Whitelist */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Port Whitelist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add single port */}
            <div className="flex space-x-2">
              <Input
                placeholder="Port number"
                value={newWhitelistPort}
                onChange={(e) => setNewWhitelistPort(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
              <Button
                onClick={() => addToList("whitelist", newWhitelistPort, false)}
                disabled={!newWhitelistPort}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Add port range */}
            <div className="flex space-x-2">
              <Input
                placeholder="Port range (e.g., 1024-2000)"
                value={newWhitelistRange}
                onChange={(e) => setNewWhitelistRange(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
              <Button
                onClick={() => addToList("whitelist", newWhitelistRange, true)}
                disabled={!newWhitelistRange}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Display ports */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">
                Single Ports
              </h4>
              <div className="flex flex-wrap gap-2">
                {whitelist.ports.map((port) => (
                  <Badge
                    key={port}
                    className="bg-green-500/10 text-green-500 flex items-center gap-1"
                  >
                    {port}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromList("whitelist", port, false)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Display ranges */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Port Ranges</h4>
              <div className="flex flex-wrap gap-2">
                {whitelist.ranges.map((range) => (
                  <Badge
                    key={range}
                    className="bg-green-500/10 text-green-500 flex items-center gap-1"
                  >
                    {range}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromList("whitelist", range, true)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Port Blacklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add single port */}
            <div className="flex space-x-2">
              <Input
                placeholder="Port number"
                value={newBlacklistPort}
                onChange={(e) => setNewBlacklistPort(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
              <Button
                onClick={() => addToList("blacklist", newBlacklistPort, false)}
                disabled={!newBlacklistPort}
                variant="destructive"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Add port range */}
            <div className="flex space-x-2">
              <Input
                placeholder="Port range (e.g., 0-20)"
                value={newBlacklistRange}
                onChange={(e) => setNewBlacklistRange(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
              <Button
                onClick={() => addToList("blacklist", newBlacklistRange, true)}
                disabled={!newBlacklistRange}
                variant="destructive"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Display ports */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">
                Single Ports
              </h4>
              <div className="flex flex-wrap gap-2">
                {blacklist.ports.map((port) => (
                  <Badge
                    key={port}
                    className="bg-red-500/10 text-red-500 flex items-center gap-1"
                  >
                    {port}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromList("blacklist", port, false)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Display ranges */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Port Ranges</h4>
              <div className="flex flex-wrap gap-2">
                {blacklist.ranges.map((range) => (
                  <Badge
                    key={range}
                    className="bg-red-500/10 text-red-500 flex items-center gap-1"
                  >
                    {range}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFromList("blacklist", range, true)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
