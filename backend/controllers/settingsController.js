const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "../data/settings.json");

// Ensure settings file exists
if (!fs.existsSync(path.dirname(settingsPath))) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
}

if (!fs.existsSync(settingsPath)) {
  const defaultSettings = {
    security: {
      autoScan: true,
      scanInterval: 3600, // 1 hour
      notifications: true,
      threatLevel: "medium",
    },
    network: {
      monitoringEnabled: true,
      portScanningEnabled: true,
      anomalyDetection: true,
      alertThreshold: 0.8,
    },
    vault: {
      autoLock: true,
      lockTimeout: 300, // 5 minutes
      backupEnabled: true,
      backupInterval: 86400, // 24 hours
    },
    system: {
      darkMode: true,
      telemetryEnabled: true,
      updateCheck: true,
      logRetention: 30, // days
    },
  };

  fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
}

// Get all settings
exports.getSettings = async (req, res) => {
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
      error: "Failed to get settings",
    });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const newSettings = req.body;
    const currentSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

    // Deep merge settings
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      security: { ...currentSettings.security, ...newSettings.security },
      network: { ...currentSettings.network, ...newSettings.network },
      vault: { ...currentSettings.vault, ...newSettings.vault },
      system: { ...currentSettings.system, ...newSettings.system },
    };

    fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));

    res.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update settings",
    });
  }
};
