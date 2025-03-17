const winston = require("winston");
const os = require("os");
const si = require("systeminformation");

// Configure Winston logger
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// System monitoring
class SystemMonitor {
  constructor() {
    this.stats = {
      lastCheck: Date.now(),
      memoryUsage: 0,
      cpuUsage: 0,
      networkConnections: 0,
    };
  }

  async updateStats() {
    try {
      // Get memory stats
      const mem = process.memoryUsage();
      this.stats.memoryUsage = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(
        2
      );

      // Get CPU stats
      const cpuLoad = await si.currentLoad();
      this.stats.cpuUsage = cpuLoad.currentLoad.toFixed(2);

      // Get network connections
      const netConnections = await si.networkConnections();
      this.stats.networkConnections = netConnections.length;

      this.stats.lastCheck = Date.now();

      // Log if resources are running high
      if (this.stats.memoryUsage > 80 || this.stats.cpuUsage > 80) {
        logger.warn("High resource usage detected", this.stats);
      }
    } catch (error) {
      logger.error("Error updating system stats:", error);
    }
  }

  getStats() {
    return this.stats;
  }
}

const systemMonitor = new SystemMonitor();

// Update stats every 30 seconds
setInterval(() => systemMonitor.updateStats(), 30000);

// Error handling wrapper
const errorHandler =
  (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error("Unhandled error:", {
        error: error.message,
        stack: error.stack,
        systemStats: systemMonitor.getStats(),
      });
      throw error;
    }
  };

module.exports = {
  logger,
  systemMonitor,
  errorHandler,
};
