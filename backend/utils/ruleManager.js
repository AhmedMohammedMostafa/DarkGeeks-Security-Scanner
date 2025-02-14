const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/rules.log" })],
});

class RuleManager {
  constructor() {
    this.configPath = path.join(__dirname, "../config");
    this.whitelistPath = path.join(this.configPath, "whitelist.json");
    this.blacklistPath = path.join(this.configPath, "blacklist.json");
    this.rulesPath = path.join(this.configPath, "security_rules.json");

    this.initializeRules();
  }

  async initializeRules() {
    try {
      await fs.mkdir(this.configPath, { recursive: true });

      try {
        await fs.access(this.whitelistPath);
      } catch {
        await fs.writeFile(
          this.whitelistPath,
          JSON.stringify(
            {
              ports: [],
              ips: [],
              domains: [],
            },
            null,
            2
          )
        );
      }

      try {
        await fs.access(this.blacklistPath);
      } catch {
        await fs.writeFile(
          this.blacklistPath,
          JSON.stringify(
            {
              ports: [],
              ips: [],
              domains: [],
            },
            null,
            2
          )
        );
      }

      try {
        await fs.access(this.rulesPath);
      } catch {
        await fs.writeFile(
          this.rulesPath,
          JSON.stringify(
            {
              portScanThreshold: 100,
              maxConnectionsPerIP: 50,
              suspiciousUserAgents: [],
              bannedFileTypes: [".exe", ".dll", ".sh", ".bat"],
              maxRequestSize: "10mb",
            },
            null,
            2
          )
        );
      }

      logger.info("Rule files initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize rule files:", error);
      throw error;
    }
  }

  async getWhitelist() {
    try {
      const data = await fs.readFile(this.whitelistPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to read whitelist:", error);
      throw error;
    }
  }

  async getBlacklist() {
    try {
      const data = await fs.readFile(this.blacklistPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to read blacklist:", error);
      throw error;
    }
  }

  async getRules() {
    try {
      const data = await fs.readFile(this.rulesPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to read security rules:", error);
      throw error;
    }
  }

  async addToWhitelist(type, value) {
    try {
      const whitelist = await this.getWhitelist();
      if (!whitelist[type]) {
        throw new Error(`Invalid type: ${type}`);
      }
      if (!whitelist[type].includes(value)) {
        whitelist[type].push(value);
        await fs.writeFile(
          this.whitelistPath,
          JSON.stringify(whitelist, null, 2)
        );
        logger.info(`Added ${value} to ${type} whitelist`);
      }
      return whitelist;
    } catch (error) {
      logger.error(`Failed to add to whitelist: ${error.message}`);
      throw error;
    }
  }

  async addToBlacklist(type, value) {
    try {
      const blacklist = await this.getBlacklist();
      if (!blacklist[type]) {
        throw new Error(`Invalid type: ${type}`);
      }
      if (!blacklist[type].includes(value)) {
        blacklist[type].push(value);
        await fs.writeFile(
          this.blacklistPath,
          JSON.stringify(blacklist, null, 2)
        );
        logger.info(`Added ${value} to ${type} blacklist`);
      }
      return blacklist;
    } catch (error) {
      logger.error(`Failed to add to blacklist: ${error.message}`);
      throw error;
    }
  }

  async removeFromWhitelist(type, value) {
    try {
      const whitelist = await this.getWhitelist();
      if (!whitelist[type]) {
        throw new Error(`Invalid type: ${type}`);
      }
      whitelist[type] = whitelist[type].filter((item) => item !== value);
      await fs.writeFile(
        this.whitelistPath,
        JSON.stringify(whitelist, null, 2)
      );
      logger.info(`Removed ${value} from ${type} whitelist`);
      return whitelist;
    } catch (error) {
      logger.error(`Failed to remove from whitelist: ${error.message}`);
      throw error;
    }
  }

  async removeFromBlacklist(type, value) {
    try {
      const blacklist = await this.getBlacklist();
      if (!blacklist[type]) {
        throw new Error(`Invalid type: ${type}`);
      }
      blacklist[type] = blacklist[type].filter((item) => item !== value);
      await fs.writeFile(
        this.blacklistPath,
        JSON.stringify(blacklist, null, 2)
      );
      logger.info(`Removed ${value} from ${type} blacklist`);
      return blacklist;
    } catch (error) {
      logger.error(`Failed to remove from blacklist: ${error.message}`);
      throw error;
    }
  }

  async updateSecurityRules(newRules) {
    try {
      const currentRules = await this.getRules();
      const updatedRules = { ...currentRules, ...newRules };
      await fs.writeFile(this.rulesPath, JSON.stringify(updatedRules, null, 2));
      logger.info("Security rules updated successfully");
      return updatedRules;
    } catch (error) {
      logger.error("Failed to update security rules:", error);
      throw error;
    }
  }

  async checkAgainstRules(item, type) {
    try {
      const [whitelist, blacklist] = await Promise.all([
        this.getWhitelist(),
        this.getBlacklist(),
      ]);

      return {
        isWhitelisted: whitelist[type]?.includes(item) || false,
        isBlacklisted: blacklist[type]?.includes(item) || false,
      };
    } catch (error) {
      logger.error("Failed to check against rules:", error);
      throw error;
    }
  }
}

module.exports = new RuleManager();
