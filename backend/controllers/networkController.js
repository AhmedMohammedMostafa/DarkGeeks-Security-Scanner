const networkMonitor = require("../../ai/manage");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

// Path configurations
const logsDir = path.join(__dirname, "../logs");
const networkStatsPath = path.join(logsDir, "network-stats.json");

// Initialize logs directory
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize network stats file
if (!fs.existsSync(networkStatsPath)) {
  fs.writeFileSync(
    networkStatsPath,
    JSON.stringify({
      trafficHistory: [],
      stats: {
        totalPackets: 0,
        totalBytes: 0,
        protocols: {},
        ports: {},
      },
    })
  );
}

exports.getNetworkTraffic = async (req, res) => {
  try {
    const data = networkMonitor.getLatestData();
    const stats = calculateNetworkStats(data.packets);

    // Update traffic history
    const history = JSON.parse(fs.readFileSync(networkStatsPath, "utf8"));
    history.trafficHistory.push({
      timestamp: new Date().toISOString(),
      ...stats,
    });

    // Keep only last 100 entries
    if (history.trafficHistory.length > 100) {
      history.trafficHistory = history.trafficHistory.slice(-100);
    }

    // Update overall stats
    history.stats = updateOverallStats(history.stats, stats);
    fs.writeFileSync(networkStatsPath, JSON.stringify(history, null, 2));

    res.json({
      success: true,
      data: {
        current: stats,
        history: history.trafficHistory,
        overall: history.stats,
      },
    });
  } catch (error) {
    console.error("Error getting network traffic:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get network traffic data",
    });
  }
};

exports.getNetworkStats = async (req, res) => {
  try {
    const { stdout: netstat } = await execAsync("netstat -n");
    const { stdout: connections } = await execAsync("netstat -b");

    const activeConnections = parseNetstatOutput(netstat);
    const processConnections = parseConnectionsOutput(connections);

    const stats = {
      activeConnections,
      processConnections,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting network stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get network statistics",
    });
  }
};

exports.getTopTalkers = async (req, res) => {
  try {
    const data = networkMonitor.getLatestData();
    const topTalkers = calculateTopTalkers(data.packets);

    res.json({
      success: true,
      data: topTalkers,
    });
  } catch (error) {
    console.error("Error getting top talkers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get top talkers",
    });
  }
};

// Helper functions
function calculateNetworkStats(packets) {
  const stats = {
    totalPackets: packets.length,
    totalBytes: 0,
    protocols: {},
    ports: {},
    sourceIPs: {},
    destinationIPs: {},
  };

  packets.forEach((packet) => {
    stats.totalBytes += packet.length;
    stats.protocols[packet.protocol] =
      (stats.protocols[packet.protocol] || 0) + 1;

    if (packet.sport) {
      stats.ports[packet.sport] = (stats.ports[packet.sport] || 0) + 1;
    }
    if (packet.dport) {
      stats.ports[packet.dport] = (stats.ports[packet.dport] || 0) + 1;
    }

    stats.sourceIPs[packet.source] = (stats.sourceIPs[packet.source] || 0) + 1;
    stats.destinationIPs[packet.destination] =
      (stats.destinationIPs[packet.destination] || 0) + 1;
  });

  return stats;
}

function updateOverallStats(overall, current) {
  return {
    totalPackets: overall.totalPackets + current.totalPackets,
    totalBytes: overall.totalBytes + current.totalBytes,
    protocols: mergeStats(overall.protocols, current.protocols),
    ports: mergeStats(overall.ports, current.ports),
  };
}

function mergeStats(old, current) {
  const merged = { ...old };
  Object.entries(current).forEach(([key, value]) => {
    merged[key] = (merged[key] || 0) + value;
  });
  return merged;
}

function calculateTopTalkers(packets) {
  const ips = {};
  packets.forEach((packet) => {
    ips[packet.source] = (ips[packet.source] || 0) + packet.length;
    ips[packet.destination] = (ips[packet.destination] || 0) + packet.length;
  });

  return Object.entries(ips)
    .map(([ip, bytes]) => ({ ip, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);
}

function parseNetstatOutput(output) {
  // Parse netstat output to get active connections
  const lines = output.split("\n");
  const connections = [];

  lines.forEach((line) => {
    if (line.includes("TCP") || line.includes("UDP")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        connections.push({
          protocol: parts[0],
          localAddress: parts[1],
          remoteAddress: parts[2],
          state: parts[3],
        });
      }
    }
  });

  return connections;
}

function parseConnectionsOutput(output) {
  // Parse netstat -b output to get process information
  const lines = output.split("\n");
  const processes = [];
  let currentProcess = null;

  lines.forEach((line) => {
    if (line.includes("[")) {
      currentProcess = line.trim().replace(/[\[\]]/g, "");
    } else if (
      currentProcess &&
      (line.includes("TCP") || line.includes("UDP"))
    ) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        processes.push({
          process: currentProcess,
          protocol: parts[0],
          localAddress: parts[1],
          remoteAddress: parts[2],
          state: parts[3],
        });
      }
    }
  });

  return processes;
}
