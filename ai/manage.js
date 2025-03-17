const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { logger } = require("../backend/utils/debug");

class NetworkMonitorManager {
  constructor() {
    this.pythonProcess = null;
    this.dataPath = path.join(__dirname, "..", "data", "packets.json");
    this.backupPath = path.join(__dirname, "..", "data", "packets.backup.json");

    // Create data directory if it doesn't exist
    const dataDir = path.dirname(this.dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize with empty data if file doesn't exist
    if (!fs.existsSync(this.dataPath)) {
      this._initializeDataFile();
    }
  }

  _initializeDataFile() {
    const emptyData = {
      packets: [],
      anomalies: [],
      lastUpdate: new Date().toISOString(),
    };
    fs.writeFileSync(this.dataPath, JSON.stringify(emptyData, null, 2));
  }

  _validateData(data) {
    // Check if data has the required structure
    if (!data || typeof data !== "object") return false;
    if (!Array.isArray(data.packets) || !Array.isArray(data.anomalies))
      return false;

    // Validate each packet has required fields
    const requiredFields = [
      "timestamp",
      "source",
      "destination",
      "protocol",
      "length",
      "ttl",
    ];
    const validPackets = data.packets.every((packet) => {
      return requiredFields.every((field) => {
        const value = packet[field];
        return value !== undefined && value !== null && value !== "";
      });
    });

    // Validate each anomaly has required fields
    const requiredAnomalyFields = [
      "timestamp",
      "source",
      "destination",
      "protocol",
      "anomaly_score",
    ];
    const validAnomalies = data.anomalies.every((anomaly) => {
      return requiredAnomalyFields.every((field) => {
        const value = anomaly[field];
        return value !== undefined && value !== null && value !== "";
      });
    });

    return validPackets && validAnomalies;
  }

  _backupData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        fs.copyFileSync(this.dataPath, this.backupPath);
      }
    } catch (error) {
      logger.error("Error creating backup:", error);
    }
  }

  _restoreFromBackup() {
    try {
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.dataPath);
        return true;
      }
    } catch (error) {
      logger.error("Error restoring from backup:", error);
    }
    return false;
  }

  getLatestData() {
    try {
      // Read the file
      if (!fs.existsSync(this.dataPath)) {
        logger.warn("Data file not found, initializing new file");
        this._initializeDataFile();
        return { packets: [], anomalies: [] };
      }

      const fileContent = fs.readFileSync(this.dataPath, "utf8");

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        logger.error("Error parsing JSON:", parseError);

        // Try to restore from backup
        if (this._restoreFromBackup()) {
          logger.info("Restored from backup file");
          const backupContent = fs.readFileSync(this.dataPath, "utf8");
          data = JSON.parse(backupContent);
        } else {
          logger.warn("Could not restore from backup, initializing new file");
          this._initializeDataFile();
          return { packets: [], anomalies: [] };
        }
      }

      // Validate data structure
      if (!this._validateData(data)) {
        logger.error("Invalid data structure detected");

        // Try to restore from backup
        if (this._restoreFromBackup()) {
          logger.info("Restored from backup file");
          const backupContent = fs.readFileSync(this.dataPath, "utf8");
          data = JSON.parse(backupContent);

          if (!this._validateData(data)) {
            logger.error("Backup data also invalid, initializing new file");
            this._initializeDataFile();
            return { packets: [], anomalies: [] };
          }
        } else {
          logger.warn("Could not restore from backup, initializing new file");
          this._initializeDataFile();
          return { packets: [], anomalies: [] };
        }
      }

      // Create backup of valid data
      this._backupData();

      return data;
    } catch (error) {
      logger.error("Error reading network data:", error);
      return { packets: [], anomalies: [] };
    }
  }

  start() {
    if (this.pythonProcess) {
      logger.info("Network monitor is already running");
      return;
    }

    const scriptPath = path.join(__dirname, "network_monitor.py");

    // Use python3 on Unix-like systems, python on Windows
    const pythonCommand = process.platform === "win32" ? "python" : "python3";

    this.pythonProcess = spawn(pythonCommand, [scriptPath], {
      stdio: "pipe",
    });

    this.pythonProcess.stdout.on("data", (data) => {
      logger.info(`Network Monitor: ${data}`);
    });

    this.pythonProcess.stderr.on("data", (data) => {
      logger.error(`Network Monitor Error: ${data}`);
    });

    this.pythonProcess.on("close", (code) => {
      logger.info(`Network Monitor process exited with code ${code}`);
      this.pythonProcess = null;
    });
  }

  stop() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
      logger.info("Network monitor stopped");
    }
  }
}

module.exports = new NetworkMonitorManager();
