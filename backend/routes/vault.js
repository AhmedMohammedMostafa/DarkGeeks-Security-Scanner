const express = require("express");
const router = express.Router();
const vaultController = require("../controllers/vaultController");

/**
 * @route   GET /api/vault/items
 * @desc    Get all vault items
 * @access  Private
 */
router.get("/items", vaultController.getVaultItems);

/**
 * @route   GET /api/vault/items/:id
 * @desc    Get a specific vault item
 * @access  Private
 */
router.get("/items/:id", vaultController.getVaultItem);

/**
 * @route   POST /api/vault/items
 * @desc    Add a new item to the vault
 * @access  Private
 */
router.post("/items", vaultController.addVaultItem);

/**
 * @route   PUT /api/vault/items/:id
 * @desc    Update a vault item
 * @access  Private
 */
router.put("/items/:id", vaultController.updateVaultItem);

/**
 * @route   DELETE /api/vault/items/:id
 * @desc    Delete a vault item
 * @access  Private
 */
router.delete("/items/:id", vaultController.deleteVaultItem);

/**
 * @route   POST /api/vault/lock
 * @desc    Lock the vault
 * @access  Private
 */
router.post("/lock", vaultController.lockVault);

/**
 * @route   POST /api/vault/unlock
 * @desc    Unlock the vault
 * @access  Private
 */
router.post("/unlock", vaultController.unlockVault);

/**
 * @route   GET /api/vault/status
 * @desc    Get vault status
 * @access  Private
 */
router.get("/status", vaultController.getVaultStatus);

module.exports = router;
