const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/vault.log" })],
});

class SecureVault {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.vaultPath = path.join(__dirname, "../config/vault");
    this.keyPath = path.join(__dirname, "../config/vault.key");
    this.initVault();
  }

  async initVault() {
    try {
      await fs.mkdir(this.vaultPath, { recursive: true });

      try {
        await fs.access(this.keyPath);
      } catch {
        const key = crypto.randomBytes(32);
        await fs.writeFile(this.keyPath, key);
        logger.info("Generated new vault encryption key");
      }
    } catch (error) {
      logger.error("Failed to initialize vault:", error);
      throw error;
    }
  }

  async getEncryptionKey() {
    try {
      return await fs.readFile(this.keyPath);
    } catch (error) {
      logger.error("Failed to read encryption key:", error);
      throw error;
    }
  }

  async encrypt(data) {
    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      logger.error("Encryption failed:", error);
      throw error;
    }
  }

  async decrypt(encryptedData) {
    try {
      const key = await this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(encryptedData.iv, "hex")
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error("Decryption failed:", error);
      throw error;
    }
  }

  async store(identifier, data) {
    try {
      const encrypted = await this.encrypt(data);
      const filePath = path.join(this.vaultPath, `${identifier}.vault`);

      await fs.writeFile(filePath, JSON.stringify(encrypted));
      logger.info(`Stored encrypted data for ${identifier}`);

      return {
        success: true,
        message: "Data stored securely",
        identifier,
      };
    } catch (error) {
      logger.error(`Failed to store data for ${identifier}:`, error);
      throw error;
    }
  }

  async retrieve(identifier) {
    try {
      const filePath = path.join(this.vaultPath, `${identifier}.vault`);
      const encryptedData = JSON.parse(await fs.readFile(filePath, "utf8"));

      const decrypted = await this.decrypt(encryptedData);
      logger.info(`Retrieved data for ${identifier}`);

      return decrypted;
    } catch (error) {
      logger.error(`Failed to retrieve data for ${identifier}:`, error);
      throw error;
    }
  }

  async delete(identifier) {
    try {
      const filePath = path.join(this.vaultPath, `${identifier}.vault`);
      await fs.unlink(filePath);
      logger.info(`Deleted data for ${identifier}`);

      return {
        success: true,
        message: "Data deleted successfully",
        identifier,
      };
    } catch (error) {
      logger.error(`Failed to delete data for ${identifier}:`, error);
      throw error;
    }
  }

  async list() {
    try {
      const files = await fs.readdir(this.vaultPath);
      return files
        .filter((file) => file.endsWith(".vault"))
        .map((file) => file.replace(".vault", ""));
    } catch (error) {
      logger.error("Failed to list vault contents:", error);
      throw error;
    }
  }

  async changeEncryptionKey() {
    try {
      const newKey = crypto.randomBytes(32);

      const files = await this.list();
      for (const identifier of files) {
        const data = await this.retrieve(identifier);
        await fs.writeFile(this.keyPath, newKey);
        await this.store(identifier, data);
      }

      logger.info("Encryption key rotated successfully");
      return {
        success: true,
        message: "Encryption key changed and data re-encrypted",
        affectedItems: files.length,
      };
    } catch (error) {
      logger.error("Failed to change encryption key:", error);
      throw error;
    }
  }
}

module.exports = new SecureVault();
