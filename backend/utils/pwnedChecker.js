const axios = require("axios");
const crypto = require("crypto");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/pwned.log" })],
});

class PwnedChecker {
  constructor() {
    this.baseUrl = "https://api.pwnedpasswords.com";
    this.breachUrl = "https://haveibeenpwned.com/api/v3";
    this.userAgent = "CybersecurityDashboard-LocalInstance";
  }

  async checkPassword(password) {
    try {
      // Hash the password with SHA-1
      const hash = crypto
        .createHash("sha1")
        .update(password)
        .digest("hex")
        .toUpperCase();
      const hashPrefix = hash.slice(0, 5);
      const hashSuffix = hash.slice(5);

      // Query the API with the hash prefix
      const response = await axios.get(`${this.baseUrl}/range/${hashPrefix}`, {
        headers: {
          "User-Agent": this.userAgent,
        },
      });

      // Parse the response
      const hashes = response.data.split("\n");
      const match = hashes.find((h) => h.split(":")[0] === hashSuffix);

      if (match) {
        const occurrences = parseInt(match.split(":")[1]);
        logger.info(`Password found in ${occurrences} breaches`);
        return {
          found: true,
          occurrences,
          message: `This password has been exposed in ${occurrences} data breaches`,
        };
      }

      logger.info("Password not found in any known breaches");
      return {
        found: false,
        occurrences: 0,
        message: "This password has not been found in any known data breaches",
      };
    } catch (error) {
      logger.error("Error checking password:", error);
      throw new Error("Failed to check password against HIBP");
    }
  }

  async checkEmail(email, apiKey) {
    if (!apiKey) {
      throw new Error("HIBP API key is required for checking email addresses");
    }

    try {
      const response = await axios.get(
        `${this.breachUrl}/breachedaccount/${email}`,
        {
          headers: {
            "hibp-api-key": apiKey,
            "User-Agent": this.userAgent,
          },
        }
      );

      const breaches = response.data;
      logger.info(`Found ${breaches.length} breaches for email ${email}`);

      return {
        found: true,
        breaches: breaches.map((breach) => ({
          name: breach.Name,
          domain: breach.Domain,
          breachDate: breach.BreachDate,
          description: breach.Description,
          dataClasses: breach.DataClasses,
        })),
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.info(`No breaches found for email ${email}`);
        return {
          found: false,
          breaches: [],
        };
      }
      logger.error("Error checking email:", error);
      throw new Error("Failed to check email against HIBP");
    }
  }

  async checkPasswordStrength(password) {
    // Basic password strength checking
    const strengthChecks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const passedChecks = Object.values(strengthChecks).filter(Boolean).length;
    let strength = "weak";
    let score = 0;

    if (passedChecks >= 4) {
      strength = "strong";
      score = 100;
    } else if (passedChecks >= 3) {
      strength = "moderate";
      score = 60;
    } else {
      score = 20;
    }

    return {
      strength,
      score,
      checks: strengthChecks,
      suggestions: this.getPasswordSuggestions(strengthChecks),
    };
  }

  getPasswordSuggestions(checks) {
    const suggestions = [];

    if (!checks.length) {
      suggestions.push("Use at least 12 characters");
    }
    if (!checks.uppercase) {
      suggestions.push("Include uppercase letters");
    }
    if (!checks.lowercase) {
      suggestions.push("Include lowercase letters");
    }
    if (!checks.numbers) {
      suggestions.push("Include numbers");
    }
    if (!checks.special) {
      suggestions.push("Include special characters");
    }

    return suggestions;
  }
}

module.exports = new PwnedChecker();
