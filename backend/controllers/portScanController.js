const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const nmap = require("node-nmap");
const os = require("os");

const whitelistPath = path.join(__dirname, "../config/whitelist.json");
const blacklistPath = path.join(__dirname, "../config/blacklist.json");
const scanHistoryPath = path.join(__dirname, "../logs/scan-history.json");
const configDir = path.join(__dirname, "../config");
const logsDir = path.join(__dirname, "../logs");

// Enhanced port information database
const portInfo = {
  20: {
    name: "FTP-DATA",
    description: "File Transfer Protocol (Data)",
    risk: "medium",
  },
  21: {
    name: "FTP",
    description: "File Transfer Protocol (Control)",
    risk: "medium",
  },
  22: { name: "SSH", description: "Secure Shell", risk: "low" },
  23: { name: "TELNET", description: "Telnet protocol", risk: "high" },
  25: {
    name: "SMTP",
    description: "Simple Mail Transfer Protocol",
    risk: "medium",
  },
  53: { name: "DNS", description: "Domain Name System", risk: "low" },
  80: {
    name: "HTTP",
    description: "Hypertext Transfer Protocol",
    risk: "medium",
  },
  110: { name: "POP3", description: "Post Office Protocol v3", risk: "medium" },
  143: {
    name: "IMAP",
    description: "Internet Message Access Protocol",
    risk: "medium",
  },
  443: { name: "HTTPS", description: "HTTP Secure", risk: "low" },
  445: { name: "SMB", description: "Server Message Block", risk: "high" },
  3306: { name: "MySQL", description: "MySQL Database", risk: "high" },
  3389: { name: "RDP", description: "Remote Desktop Protocol", risk: "high" },
  5432: {
    name: "PostgreSQL",
    description: "PostgreSQL Database",
    risk: "high",
  },
  27017: { name: "MongoDB", description: "MongoDB Database", risk: "high" },
  8080: {
    name: "HTTP-ALT",
    description: "Alternative HTTP Port",
    risk: "medium",
  },
  8443: {
    name: "HTTPS-ALT",
    description: "Alternative HTTPS Port",
    risk: "medium",
  },
  1433: { name: "MSSQL", description: "Microsoft SQL Server", risk: "high" },
  3000: { name: "DEV", description: "Common Development Port", risk: "medium" },
  5000: { name: "DEV", description: "Common Development Port", risk: "medium" },
};

// Initialize directories and files
async function initializeFiles() {
  try {
    // Create directories if they don't exist
    await fs.mkdir(configDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    // Initialize whitelist if it doesn't exist
    try {
      await fs.access(whitelistPath);
    } catch {
      await fs.writeFile(
        whitelistPath,
        JSON.stringify(
          {
            ports: [80, 443, 3000, 5000, 8080],
            ranges: ["1024-2000"],
            descriptions: {
              80: "Web server (HTTP)",
              443: "Web server (HTTPS)",
              3000: "Development server",
              5000: "Development server",
              8080: "Alternative HTTP port",
            },
          },
          null,
          2
        )
      );
    }

    // Initialize blacklist if it doesn't exist
    try {
      await fs.access(blacklistPath);
    } catch {
      await fs.writeFile(
        blacklistPath,
        JSON.stringify(
          {
            ports: [23, 445, 3389],
            ranges: ["0-20"],
            descriptions: {
              23: "Telnet (insecure)",
              445: "SMB (potentially dangerous)",
              3389: "RDP (high-risk remote access)",
            },
          },
          null,
          2
        )
      );
    }

    // Initialize scan history if it doesn't exist
    try {
      await fs.access(scanHistoryPath);
    } catch {
      await fs.writeFile(
        scanHistoryPath,
        JSON.stringify(
          {
            scans: [],
            metrics: {
              totalScans: 0,
              lastScanTime: null,
              averageDuration: 0,
              mostCommonPorts: {},
            },
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error("Error initializing files:", error);
  }
}

// Initialize files on module load
initializeFiles();

// Enhanced service detection
function getPortInfo(port) {
  const portNumber = parseInt(port);
  if (portInfo[portNumber]) {
    return portInfo[portNumber];
  }

  // Common port ranges classification
  if (portNumber < 1024) {
    return {
      name: "System",
      description: "Well-known system port",
      risk: "medium",
    };
  } else if (portNumber >= 1024 && portNumber <= 49151) {
    return {
      name: "User",
      description: "Registered port",
      risk: "medium",
    };
  } else {
    return {
      name: "Dynamic",
      description: "Dynamic/Private port",
      risk: "low",
    };
  }
}

// Enhanced risk assessment
function assessRisk(port, status, serviceInfo) {
  if (status === "blacklisted") return "high";
  if (status === "whitelisted") return "low";

  const portNum = parseInt(port);
  const info = serviceInfo || getPortInfo(portNum);

  // High-risk port ranges
  const highRiskRanges = [
    [0, 20], // System ports
    [135, 139], // NetBIOS
    [445, 445], // SMB
    [3389, 3389], // RDP
    [5900, 5902], // VNC
  ];

  // Check if port is in high-risk range
  const isHighRisk = highRiskRanges.some(
    ([start, end]) => portNum >= start && portNum <= end
  );

  if (isHighRisk) return "high";
  if (info.risk) return info.risk;

  return "medium";
}

/**
 * Scan local machine for open ports
 */
exports.scanLocalPorts = async (req, res) => {
  try {
    const scanStartTime = Date.now();
    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
    };

    // Use NmapScan for full port range with optimized settings
    const fullScan = new nmap.NmapScan("127.0.0.1", [
      "-p-", // Scan all 65535 ports
      "-T4", // Aggressive timing
      "-sV", // Version detection
      "--version-intensity 5", // More aggressive version detection
      "--min-rate=1000",
      "--max-retries=2",
    ]);

    let progressInterval;
    let scanProgress = {
      startTime: scanStartTime,
      elapsedTime: 0,
      status: "running",
      portsScanned: 0,
    };

    // Set up progress tracking
    progressInterval = setInterval(() => {
      scanProgress.elapsedTime = Date.now() - scanStartTime;
      scanProgress.portsScanned = Math.floor(
        (scanProgress.elapsedTime / 300000) * 65535
      ); // Estimate based on typical scan time
      console.log(
        `Scan progress: ~${Math.min(
          100,
          Math.floor((scanProgress.portsScanned / 65535) * 100)
        )}%`
      );
    }, 5000);

    fullScan.on("complete", async (data) => {
      clearInterval(progressInterval);
      try {
        const [whitelistData, blacklistData] = await Promise.all([
          fs.readFile(whitelistPath, "utf8"),
          fs.readFile(blacklistPath, "utf8"),
        ]);

        const whitelist = JSON.parse(whitelistData);
        const blacklist = JSON.parse(blacklistData);

        // Process scan results with enhanced information
        const scanResults = data.map((host) => {
          const openPorts = (host.openPorts || []).map((port) => {
            const portNum = parseInt(port.port);
            const portInfo = getPortInfo(portNum);
            const status = blacklist.ports.includes(portNum)
              ? "blacklisted"
              : whitelist.ports.includes(portNum)
              ? "whitelisted"
              : "unknown";

            return {
              port: portNum,
              service: port.service || portInfo.name,
              description: portInfo.description,
              status,
              risk: assessRisk(portNum, status, portInfo),
              version: port.version || "Unknown",
              additionalInfo: {
                protocol: port.protocol || "tcp",
                state: port.state || "open",
                reason: port.reason || "syn-ack",
              },
            };
          });

          return {
            ...host,
            openPorts,
            systemInfo,
          };
        });

        // Update scan history with enhanced metrics
        const scanHistoryData = await fs.readFile(scanHistoryPath, "utf8");
        const scanHistory = JSON.parse(scanHistoryData);
        const scanDuration = Date.now() - scanStartTime;

        const newScan = {
          timestamp: new Date().toISOString(),
          duration: scanDuration,
          results: scanResults,
          systemInfo,
          metrics: {
            totalPorts: 65535,
            openPorts: scanResults.reduce(
              (total, host) => total + (host.openPorts?.length || 0),
              0
            ),
            scanTime: scanDuration,
            riskBreakdown: {
              high: 0,
              medium: 0,
              low: 0,
            },
          },
        };

        // Calculate risk breakdown
        scanResults.forEach((host) => {
          host.openPorts.forEach((port) => {
            newScan.metrics.riskBreakdown[port.risk]++;
          });
        });

        scanHistory.scans.push(newScan);
        scanHistory.metrics.totalScans++;
        scanHistory.metrics.lastScanTime = newScan.timestamp;
        scanHistory.metrics.averageDuration =
          (scanHistory.metrics.averageDuration *
            (scanHistory.metrics.totalScans - 1) +
            scanDuration) /
          scanHistory.metrics.totalScans;

        // Keep only recent scans
        if (scanHistory.scans.length > 50) {
          scanHistory.scans = scanHistory.scans.slice(-50);
        }

        await fs.writeFile(
          scanHistoryPath,
          JSON.stringify(scanHistory, null, 2)
        );

        res.json({
          success: true,
          data: {
            results: scanResults,
            metrics: newScan.metrics,
            systemInfo,
          },
        });
      } catch (error) {
        console.error("Error processing scan results:", error);
        res.status(500).json({
          success: false,
          error: "Error processing scan results",
        });
      }
    });

    fullScan.on("error", (error) => {
      clearInterval(progressInterval);
      console.error("Nmap scan error:", error);
      res.status(500).json({
        success: false,
        error: "Error scanning ports",
      });
    });

    fullScan.startScan();
  } catch (error) {
    console.error("Port scan error:", error);
    res.status(500).json({
      success: false,
      error: "Error scanning ports",
    });
  }
};

/**
 * Scan custom IP or port range
 */
exports.scanCustomPorts = async (req, res) => {
  try {
    const { target, ports } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: "Target IP or hostname is required",
      });
    }

    let nmapArgs = [];
    if (ports) {
      nmapArgs.push(`-p ${ports}`);
    }

    const scan = new nmap.NmapScan(target, nmapArgs);

    scan.on("complete", async (data) => {
      try {
        const [whitelistData, blacklistData] = await Promise.all([
          fs.readFile(whitelistPath, "utf8"),
          fs.readFile(blacklistPath, "utf8"),
        ]);

        const whitelist = JSON.parse(whitelistData).ports;
        const blacklist = JSON.parse(blacklistData).ports;

        const scanResults = data.map((host) => ({
          ...host,
          openPorts: (host.openPorts || []).map((port) => ({
            port: port.port,
            service: port.service,
            status: blacklist.includes(parseInt(port.port))
              ? "blacklisted"
              : whitelist.includes(parseInt(port.port))
              ? "whitelisted"
              : "unknown",
          })),
        }));

        const scanHistoryData = await fs.readFile(scanHistoryPath, "utf8");
        const scanHistory = JSON.parse(scanHistoryData);

        scanHistory.scans.push({
          timestamp: new Date().toISOString(),
          target,
          ports,
          results: scanResults,
        });

        if (scanHistory.scans.length > 50) {
          scanHistory.scans = scanHistory.scans.slice(-50);
        }

        await fs.writeFile(
          scanHistoryPath,
          JSON.stringify(scanHistory, null, 2)
        );

        res.json({
          success: true,
          data: scanResults,
        });
      } catch (error) {
        console.error("Error processing scan results:", error);
        res.status(500).json({
          success: false,
          error: "Error processing scan results",
        });
      }
    });

    scan.on("error", (error) => {
      console.error("Nmap scan error:", error);
      res.status(500).json({
        success: false,
        error: "Error scanning ports",
      });
    });

    scan.startScan();
  } catch (error) {
    console.error("Custom port scan error:", error);
    res.status(500).json({
      success: false,
      error: "Error scanning custom ports",
    });
  }
};

/**
 * Get scan history
 */
exports.getScanHistory = async (req, res) => {
  try {
    const scanHistoryData = await fs.readFile(scanHistoryPath, "utf8");
    const scanHistory = JSON.parse(scanHistoryData);
    res.json({
      success: true,
      data: scanHistory.scans,
    });
  } catch (error) {
    console.error("Error getting scan history:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving scan history",
    });
  }
};

/**
 * Get port whitelist
 */
exports.getWhitelist = async (req, res) => {
  try {
    const whitelistData = await fs.readFile(whitelistPath, "utf8");
    const whitelist = JSON.parse(whitelistData);
    res.json({
      success: true,
      data: whitelist.ports,
    });
  } catch (error) {
    console.error("Error getting whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving whitelist",
    });
  }
};

/**
 * Add port to whitelist
 */
exports.addToWhitelist = async (req, res) => {
  try {
    const { port } = req.body;

    if (!port || isNaN(parseInt(port))) {
      return res.status(400).json({
        success: false,
        error: "Valid port number is required",
      });
    }

    const portNum = parseInt(port);
    const whitelistData = await fs.readFile(whitelistPath, "utf8");
    const whitelist = JSON.parse(whitelistData);

    if (whitelist.ports.includes(portNum)) {
      return res.json({
        success: true,
        message: "Port already in whitelist",
        data: whitelist.ports,
      });
    }

    // Add to whitelist
    whitelist.ports.push(portNum);
    await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));

    // Remove from blacklist if present
    const blacklistData = await fs.readFile(blacklistPath, "utf8");
    const blacklist = JSON.parse(blacklistData);
    if (blacklist.ports.includes(portNum)) {
      blacklist.ports = blacklist.ports.filter((p) => p !== portNum);
      await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2));
    }

    res.json({
      success: true,
      message: "Port added to whitelist",
      data: whitelist.ports,
    });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Error adding port to whitelist",
    });
  }
};

/**
 * Remove port from whitelist
 */
exports.removeFromWhitelist = async (req, res) => {
  try {
    const portNum = parseInt(req.params.port);

    if (isNaN(portNum)) {
      return res.status(400).json({
        success: false,
        error: "Valid port number is required",
      });
    }

    const whitelistData = await fs.readFile(whitelistPath, "utf8");
    const whitelist = JSON.parse(whitelistData);

    if (!whitelist.ports.includes(portNum)) {
      return res.json({
        success: true,
        message: "Port not in whitelist",
        data: whitelist.ports,
      });
    }

    // Remove from whitelist
    whitelist.ports = whitelist.ports.filter((p) => p !== portNum);
    await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));

    res.json({
      success: true,
      message: "Port removed from whitelist",
      data: whitelist.ports,
    });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    res.status(500).json({
      success: false,
      error: "Error removing port from whitelist",
    });
  }
};

/**
 * Get port blacklist
 */
exports.getBlacklist = async (req, res) => {
  try {
    const blacklistData = await fs.readFile(blacklistPath, "utf8");
    const blacklist = JSON.parse(blacklistData);
    res.json({
      success: true,
      data: blacklist.ports,
    });
  } catch (error) {
    console.error("Error getting blacklist:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving blacklist",
    });
  }
};

/**
 * Add port to blacklist
 */
exports.addToBlacklist = async (req, res) => {
  try {
    const { port } = req.body;

    if (!port || isNaN(parseInt(port))) {
      return res.status(400).json({
        success: false,
        error: "Valid port number is required",
      });
    }

    const portNum = parseInt(port);
    const blacklistData = await fs.readFile(blacklistPath, "utf8");
    const blacklist = JSON.parse(blacklistData);

    if (blacklist.ports.includes(portNum)) {
      return res.json({
        success: true,
        message: "Port already in blacklist",
        data: blacklist.ports,
      });
    }

    // Add to blacklist
    blacklist.ports.push(portNum);
    await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2));

    // Remove from whitelist if present
    const whitelistData = await fs.readFile(whitelistPath, "utf8");
    const whitelist = JSON.parse(whitelistData);
    if (whitelist.ports.includes(portNum)) {
      whitelist.ports = whitelist.ports.filter((p) => p !== portNum);
      await fs.writeFile(whitelistPath, JSON.stringify(whitelist, null, 2));
    }

    res.json({
      success: true,
      message: "Port added to blacklist",
      data: blacklist.ports,
    });
  } catch (error) {
    console.error("Error adding to blacklist:", error);
    res.status(500).json({
      success: false,
      error: "Error adding port to blacklist",
    });
  }
};

/**
 * Remove port from blacklist
 */
exports.removeFromBlacklist = async (req, res) => {
  try {
    const portNum = parseInt(req.params.port);

    if (isNaN(portNum)) {
      return res.status(400).json({
        success: false,
        error: "Valid port number is required",
      });
    }

    const blacklistData = await fs.readFile(blacklistPath, "utf8");
    const blacklist = JSON.parse(blacklistData);

    if (!blacklist.ports.includes(portNum)) {
      return res.json({
        success: true,
        message: "Port not in blacklist",
        data: blacklist.ports,
      });
    }

    // Remove from blacklist
    blacklist.ports = blacklist.ports.filter((p) => p !== portNum);
    await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2));

    res.json({
      success: true,
      message: "Port removed from blacklist",
      data: blacklist.ports,
    });
  } catch (error) {
    console.error("Error removing from blacklist:", error);
    res.status(500).json({
      success: false,
      error: "Error removing port from blacklist",
    });
  }
};

// Updated helper functions
function getServiceName(port) {
  const commonPorts = {
    20: "FTP-DATA",
    21: "FTP",
    22: "SSH",
    23: "TELNET",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    27017: "MongoDB",
    8080: "HTTP-ALT",
    8443: "HTTPS-ALT",
    1433: "MSSQL",
    3000: "DEV",
    5000: "DEV",
  };
  return commonPorts[port] || "Unknown";
}

function isHighRiskPort(port) {
  const highRiskPorts = [23, 135, 137, 138, 139, 445, 3389, 5900, 5901];
  return highRiskPorts.includes(parseInt(port));
}

function getRiskLevel(port) {
  if (port.status === "blacklisted") return "high";
  if (isHighRiskPort(port.port)) return "medium";
  return "low";
}

/**
 * Helper function to get recent scans from history file
 */
async function getRecentScans() {
  try {
    // Use the already defined scanHistoryPath instead of creating a new path
    try {
      await fs.access(scanHistoryPath);
    } catch (error) {
      // Create file with empty array if it doesn't exist
      await fs.writeFile(
        scanHistoryPath,
        JSON.stringify({ scans: [] }, null, 2)
      );
      return [];
    }

    // Read and parse file
    const data = await fs.readFile(scanHistoryPath, "utf8");
    const history = JSON.parse(data);

    if (!history || !Array.isArray(history.scans)) {
      console.warn("Invalid scan history format");
      return [];
    }

    // Return last 10 scans
    return history.scans.slice(-10);
  } catch (error) {
    console.error("Error reading scan history:", error);
    return [];
  }
}

/**
 * Get port scan statistics
 */
exports.getStats = async (req, res) => {
  try {
    // Get recent scans from scan history
    const recentScans = await getRecentScans();

    // Initialize stats object
    const stats = {
      totalScanned: 0,
      openPorts: 0,
      vulnerabilities: 0,
      lastScan: null,
      commonPorts: [],
      recentFindings: [],
      portHistory: [],
    };

    // Early return if no scans
    if (
      !recentScans ||
      !Array.isArray(recentScans) ||
      recentScans.length === 0
    ) {
      return res.json({
        success: true,
        data: stats,
      });
    }

    // Set last scan timestamp
    stats.lastScan = recentScans[0]?.timestamp || null;

    const portCounts = new Map();
    const findings = [];

    // Process each scan
    recentScans.forEach((scan) => {
      try {
        // Skip if this is a malware scan result
        if (scan.results?.windowsDefender || scan.results?.clamAV) {
          return;
        }

        // Handle port scan results
        const results = Array.isArray(scan.results) ? scan.results : [];
        stats.totalScanned += results.length;

        results.forEach((host) => {
          if (!host || !Array.isArray(host.openPorts)) {
            return;
          }

          const openPorts = host.openPorts || [];
          stats.openPorts += openPorts.length;

          openPorts.forEach((port) => {
            try {
              const portNum = parseInt(port.port);
              if (isNaN(portNum)) {
                return;
              }

              // Track port frequency
              const count = portCounts.get(portNum) || 0;
              portCounts.set(portNum, count + 1);

              // Track findings
              const risk = getRiskLevel(port);
              if (risk === "high") {
                stats.vulnerabilities++;
              }

              findings.push({
                port: portNum,
                service: port.service || getServiceName(portNum),
                risk: risk,
                details: `${port.status || "unknown"} - ${
                  port.service || "Unknown service"
                }`,
              });
            } catch (portError) {
              console.error("Error processing port:", portError);
            }
          });
        });
      } catch (scanError) {
        console.error("Error processing scan:", scanError);
      }
    });

    // Get most common ports
    stats.commonPorts = Array.from(portCounts.entries())
      .map(([port, count]) => ({
        port,
        service: getServiceName(port),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent findings
    stats.recentFindings = findings
      .sort((a, b) => b.risk.localeCompare(a.risk))
      .slice(0, 10);

    // Get port history
    stats.portHistory = recentScans
      .filter((scan) => Array.isArray(scan.results)) // Only include port scans
      .map((scan) => {
        try {
          let openPortCount = 0;
          let closedPortCount = 0;

          if (Array.isArray(scan.results)) {
            scan.results.forEach((host) => {
              if (host) {
                openPortCount += Array.isArray(host.openPorts)
                  ? host.openPorts.length
                  : 0;
                closedPortCount += Array.isArray(host.closedPorts)
                  ? host.closedPorts.length
                  : 0;
              }
            });
          }

          return {
            timestamp: scan.timestamp,
            openPorts: openPortCount,
            closedPorts: closedPortCount,
          };
        } catch (historyError) {
          console.error("Error processing scan history:", historyError);
          return {
            timestamp: scan.timestamp,
            openPorts: 0,
            closedPorts: 0,
          };
        }
      })
      .filter((entry) => entry.timestamp)
      .slice(0, 7)
      .reverse();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting port scan stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get port scan statistics",
    });
  }
};
