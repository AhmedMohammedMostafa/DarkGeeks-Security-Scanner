const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Path to vault file
const vaultPath = path.join(__dirname, "../data/vault.json");
const dataDir = path.join(__dirname, "../data");

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize vault file if it doesn't exist
if (!fs.existsSync(vaultPath)) {
  const initialVault = {
    locked: true,
    salt: crypto.randomBytes(32).toString("hex"),
    key: null,
    itemCount: 0,
    encryptionType: "AES-256-GCM",
    lastAccess: new Date().toISOString(),
    items: [],
  };
  fs.writeFileSync(vaultPath, JSON.stringify(initialVault, null, 2));
}

// Encryption functions
const generateKey = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
};

const encrypt = (text, key) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    encrypted: encrypted.toString("hex"),
    tag: tag.toString("hex"),
  };
};

const decrypt = (encryptedData, key) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.encrypted, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

/**
 * Get all vault items
 */
exports.getVaultItems = (req, res) => {
  try {
    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

    if (vault.locked) {
      return res.status(401).json({
        success: false,
        error: "Vault is locked",
      });
    }

    const key = Buffer.from(vault.key, "hex");
    const decryptedItems = vault.items.map((item) => ({
      ...item,
      data: JSON.parse(decrypt(item.data, key)),
    }));

    res.json({
      success: true,
      data: decryptedItems,
    });
  } catch (error) {
    console.error("Error getting vault items:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get vault items",
    });
  }
};

/**
 * Get a specific vault item
 */
exports.getVaultItem = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Item ID is required",
      });
    }

    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

    if (vault.locked) {
      return res.status(403).json({
        success: false,
        error: "Vault is locked",
      });
    }

    const item = vault.items.find((item) => item.id === id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    // Decrypt sensitive data
    const decryptedItem = {
      ...item,
      data: JSON.parse(decrypt(item.data, Buffer.from(vault.key, "hex"))),
    };

    // Remove encrypted data from response
    delete decryptedItem.data.encrypted;
    delete decryptedItem.data.iv;
    delete decryptedItem.data.tag;

    res.json({
      success: true,
      data: decryptedItem,
    });
  } catch (error) {
    console.error("Error getting vault item:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving vault item",
    });
  }
};

/**
 * Add a new item to the vault
 */
exports.addVaultItem = (req, res) => {
  try {
    const { type, name, value, tags = [] } = req.body;
    if (!type || !name || !value) {
      return res.status(400).json({
        success: false,
        error: "Type, name, and value are required",
      });
    }

    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

    if (vault.locked) {
      return res.status(401).json({
        success: false,
        error: "Vault is locked",
      });
    }

    const key = Buffer.from(vault.key, "hex");
    const itemData = {
      value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const encryptedData = encrypt(JSON.stringify(itemData), key);
    const newItem = {
      id: crypto.randomUUID(),
      type,
      name,
      tags,
      data: encryptedData,
    };

    vault.items.push(newItem);
    vault.itemCount = vault.items.length;
    vault.lastAccess = new Date().toISOString();

    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    res.json({
      success: true,
      data: {
        ...newItem,
        data: itemData,
      },
    });
  } catch (error) {
    console.error("Error adding vault item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add vault item",
    });
  }
};

/**
 * Update a vault item
 */
exports.updateVaultItem = (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, data } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Item ID is required",
      });
    }

    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

    if (vault.locked) {
      return res.status(403).json({
        success: false,
        error: "Vault is locked",
      });
    }

    const itemIndex = vault.items.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    // Update the item
    if (name) {
      vault.items[itemIndex].name = name;
    }

    if (type) {
      vault.items[itemIndex].type = type;
    }

    if (data) {
      // Encrypt the new data
      const key = Buffer.from(vault.key, "hex");
      vault.items[itemIndex].data = encrypt(JSON.stringify(data), key);
    }

    vault.items[itemIndex].updatedAt = new Date().toISOString();

    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    // Return item without sensitive data
    const returnItem = {
      id: vault.items[itemIndex].id,
      name: vault.items[itemIndex].name,
      type: vault.items[itemIndex].type,
      createdAt: vault.items[itemIndex].createdAt,
      updatedAt: vault.items[itemIndex].updatedAt,
    };

    res.json({
      success: true,
      data: returnItem,
    });
  } catch (error) {
    console.error("Error updating vault item:", error);
    res.status(500).json({
      success: false,
      error: "Error updating vault item",
    });
  }
};

/**
 * Delete a vault item
 */
exports.deleteVaultItem = (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Item ID is required",
      });
    }

    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));

    if (vault.locked) {
      return res.status(401).json({
        success: false,
        error: "Vault is locked",
      });
    }

    const itemIndex = vault.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    vault.items.splice(itemIndex, 1);
    vault.itemCount = vault.items.length;
    vault.lastAccess = new Date().toISOString();

    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    res.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vault item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete vault item",
    });
  }
};

/**
 * Lock the vault
 */
exports.lockVault = (req, res) => {
  try {
    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));
    vault.locked = true;
    vault.lastAccess = new Date().toISOString();
    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    res.json({
      success: true,
      message: "Vault locked successfully",
    });
  } catch (error) {
    console.error("Error locking vault:", error);
    res.status(500).json({
      success: false,
      error: "Failed to lock vault",
    });
  }
};

/**
 * Unlock the vault
 */
exports.unlockVault = (req, res) => {
  try {
    const { password, isFirstTime } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required",
      });
    }

    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));
    const key = generateKey(password, Buffer.from(vault.salt, "hex"));

    if (isFirstTime || !vault.key) {
      // First-time setup
      vault.key = key.toString("hex");
      vault.locked = false;
      vault.lastAccess = new Date().toISOString();
      fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

      return res.json({
        success: true,
        message: "Vault created and unlocked successfully",
      });
    }

    // Verify password for existing vault
    if (key.toString("hex") !== vault.key) {
      return res.status(401).json({
        success: false,
        error: "Invalid password",
      });
    }

    vault.locked = false;
    vault.lastAccess = new Date().toISOString();
    fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

    res.json({
      success: true,
      message: "Vault unlocked successfully",
    });
  } catch (error) {
    console.error("Error unlocking vault:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unlock vault",
    });
  }
};

/**
 * Get vault status
 */
exports.getVaultStatus = (req, res) => {
  try {
    const vault = JSON.parse(fs.readFileSync(vaultPath, "utf8"));
    res.json({
      success: true,
      data: {
        locked: vault.locked,
        itemCount: vault.itemCount,
        encryptionType: vault.encryptionType,
        lastAccess: vault.lastAccess,
        salt: vault.salt,
        key: vault.key, // Will be null if locked
      },
    });
  } catch (error) {
    console.error("Error getting vault status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get vault status",
    });
  }
};
