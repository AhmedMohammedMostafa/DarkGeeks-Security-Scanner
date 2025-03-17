const fs = require("fs");
const path = require("path");
const networkMonitor = require("../../ai/manage");
const NetworkMonitorManager = require("../../ai/manage");

// Path to settings and history files
const settingsPath = path.join(__dirname, "../config/anomaly-settings.json");
const historyPath = path.join(__dirname, "../logs/anomaly-history.json");
const logsDir = path.join(__dirname, "../logs");
const configDir = path.join(__dirname, "../config");

// Create directories if they don't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Initialize settings file if it doesn't exist
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        threshold: 0.8,
        monitoringEnabled: true,
        captureInterval: 60, // seconds
        maxPacketsPerCapture: 1000,
        alertOnAnomaly: true,
      },
      null,
      2
    )
  );
}

// Initialize history file if it doesn't exist
if (!fs.existsSync(historyPath)) {
  fs.writeFileSync(
    historyPath,
    JSON.stringify(
      {
        anomalies: [],
      },
      null,
      2
    )
  );
}

// Start network monitoring if enabled
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
if (settings.monitoringEnabled) {
  networkMonitor.start();
}

/**
 * Detect anomalies in network traffic
 */
exports.detectAnomalies = async (req, res) => {
  try {
    const data = networkMonitor.getLatestData();
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    // Get anomalies from AI detection
    const anomalies = data.anomalies;

    // Save anomalies to history
    if (anomalies.length > 0 && settings.alertOnAnomaly) {
      const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));

      anomalies.forEach((anomaly) => {
        history.anomalies.push(anomaly);
      });

      // Keep only the last 100 anomalies
      if (history.anomalies.length > 100) {
        history.anomalies = history.anomalies.slice(-100);
      }

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }

    res.json({
      success: true,
      data: {
        anomalies,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    res.status(500).json({
      success: false,
      error: "Error detecting anomalies",
    });
  }
};

/**
 * Get current network traffic data
 */
exports.getNetworkTraffic = (req, res) => {
  try {
    const data = NetworkMonitorManager.getLatestData();

    // If we got empty data due to an error, return a specific message
    if (!data.packets || data.packets.length === 0) {
      return res.json({
        success: true,
        data: {
          packets: [],
          anomalies: [],
          message:
            "No network data available or data was reset due to corruption",
        },
      });
    }

    // Return the valid data
    res.json({
      success: true,
      data: {
        packets: data.packets,
        anomalies: data.anomalies,
      },
    });
  } catch (error) {
    console.error("Error in network traffic endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve network traffic data",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Calculate statistics from packets
 */
function calculateStats(packets) {
  const stats = {
    totalPackets: packets.length,
    protocolDistribution: {},
    sourceIpDistribution: {},
    destinationIpDistribution: {},
    portDistribution: {},
  };

  packets.forEach((packet) => {
    // Protocol distribution
    stats.protocolDistribution[packet.protocol] =
      (stats.protocolDistribution[packet.protocol] || 0) + 1;

    // Source IP distribution
    stats.sourceIpDistribution[packet.source] =
      (stats.sourceIpDistribution[packet.source] || 0) + 1;

    // Destination IP distribution
    stats.destinationIpDistribution[packet.destination] =
      (stats.destinationIpDistribution[packet.destination] || 0) + 1;

    // Port distribution
    if (packet.dport) {
      const portKey = `${packet.dport}`;
      stats.portDistribution[portKey] =
        (stats.portDistribution[portKey] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Get anomaly detection history
 */
exports.getAnomalyHistory = (req, res) => {
  try {
    const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));

    res.json({
      success: true,
      data: history.anomalies,
    });
  } catch (error) {
    console.error("Error getting anomaly history:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving anomaly history",
    });
  }
};

/**
 * Update anomaly detection threshold
 */
exports.updateThreshold = (req, res) => {
  try {
    const { threshold } = req.body;

    if (threshold === undefined || threshold < 0 || threshold > 1) {
      return res.status(400).json({
        success: false,
        error: "Valid threshold between 0 and 1 is required",
      });
    }

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    settings.threshold = threshold;

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error updating threshold:", error);
    res.status(500).json({
      success: false,
      error: "Error updating anomaly detection threshold",
    });
  }
};

/**
 * Get anomaly detection settings
 */
exports.getSettings = (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving anomaly detection settings",
    });
  }
};

/**
 * Update anomaly detection settings
 */
exports.updateSettings = (req, res) => {
  try {
    const {
      monitoringEnabled,
      captureInterval,
      maxPacketsPerCapture,
      alertOnAnomaly,
    } = req.body;

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    if (monitoringEnabled !== undefined) {
      settings.monitoringEnabled = !!monitoringEnabled;
      if (settings.monitoringEnabled) {
        networkMonitor.start();
      } else {
        networkMonitor.stop();
      }
    }

    if (captureInterval !== undefined && captureInterval > 0) {
      settings.captureInterval = captureInterval;
    }

    if (maxPacketsPerCapture !== undefined && maxPacketsPerCapture > 0) {
      settings.maxPacketsPerCapture = maxPacketsPerCapture;
    }

    if (alertOnAnomaly !== undefined) {
      settings.alertOnAnomaly = !!alertOnAnomaly;
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      error: "Error updating anomaly detection settings",
    });
  }
};
