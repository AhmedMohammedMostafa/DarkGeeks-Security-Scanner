const net = require("net");
const { promisify } = require("util");
const winston = require("winston");

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/scanner.log" })],
});

class PortScanner {
  constructor() {
    this.commonPorts = {
      20: "FTP Data",
      21: "FTP Control",
      22: "SSH",
      23: "Telnet",
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
    };
  }

  async scanPort(host, port, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status = "closed";
      let error = null;

      // Handle connection
      socket.on("connect", () => {
        status = "open";
        socket.destroy();
      });

      // Handle errors
      socket.on("error", (err) => {
        error = err.message;
        socket.destroy();
      });

      // Handle connection close
      socket.on("close", () => {
        resolve({
          port,
          status,
          service: this.commonPorts[port] || "unknown",
          error,
        });
      });

      // Set timeout
      socket.setTimeout(timeout);
      socket.on("timeout", () => {
        status = "timeout";
        socket.destroy();
      });

      // Attempt connection
      socket.connect(port, host);
    });
  }

  async scanRange(host, startPort, endPort, callback = null) {
    const results = [];
    const ports = Array.from(
      { length: endPort - startPort + 1 },
      (_, i) => startPort + i
    );

    // Log scan initiation
    logger.info(
      `Starting port scan on ${host} from port ${startPort} to ${endPort}`
    );

    for (const port of ports) {
      const result = await this.scanPort(host, port);
      results.push(result);

      // If callback provided (e.g., for real-time updates via Socket.io)
      if (callback && typeof callback === "function") {
        callback({
          current: port,
          total: endPort - startPort + 1,
          result,
        });
      }

      // Log open ports
      if (result.status === "open") {
        logger.info(`Found open port ${port} (${result.service}) on ${host}`);
      }
    }

    // Log scan completion
    logger.info(`Completed port scan on ${host}`);

    return {
      host,
      timestamp: new Date().toISOString(),
      results: results.filter((r) => r.status === "open"),
      totalScanned: ports.length,
      openPorts: results.filter((r) => r.status === "open").length,
    };
  }

  async quickScan(host, callback = null) {
    // Scan only common ports
    const commonPortNumbers = Object.keys(this.commonPorts).map(Number);
    const results = [];

    logger.info(`Starting quick scan on ${host} for common ports`);

    for (const port of commonPortNumbers) {
      const result = await this.scanPort(host, port);
      results.push(result);

      if (callback && typeof callback === "function") {
        callback({
          current: port,
          total: commonPortNumbers.length,
          result,
        });
      }

      if (result.status === "open") {
        logger.info(`Found open port ${port} (${result.service}) on ${host}`);
      }
    }

    logger.info(`Completed quick scan on ${host}`);

    return {
      host,
      timestamp: new Date().toISOString(),
      results: results.filter((r) => r.status === "open"),
      totalScanned: commonPortNumbers.length,
      openPorts: results.filter((r) => r.status === "open").length,
    };
  }
}

module.exports = new PortScanner();
