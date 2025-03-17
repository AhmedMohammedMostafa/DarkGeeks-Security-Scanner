const express = require("express");
const router = express.Router();
const portScanController = require("../controllers/portScanController");

/**
 * @route   GET /api/scan/ports
 * @desc    Scan for open ports on the local machine
 * @access  Private
 */
router.get("/ports", portScanController.scanLocalPorts);

/**
 * @route   POST /api/scan/ports/custom
 * @desc    Scan specific ports or IP ranges
 * @access  Private
 */
router.post("/ports/custom", portScanController.scanCustomPorts);

/**
 * @route   GET /api/scan/history
 * @desc    Get scan history
 * @access  Private
 */
router.get("/history", portScanController.getScanHistory);

/**
 * @route   GET /api/scan/whitelist
 * @desc    Get port whitelist
 * @access  Private
 */
router.get("/whitelist", portScanController.getWhitelist);

/**
 * @route   POST /api/scan/whitelist
 * @desc    Add port to whitelist
 * @access  Private
 */
router.post("/whitelist", portScanController.addToWhitelist);

/**
 * @route   DELETE /api/scan/whitelist/:port
 * @desc    Remove port from whitelist
 * @access  Private
 */
router.delete("/whitelist/:port", portScanController.removeFromWhitelist);

/**
 * @route   GET /api/scan/blacklist
 * @desc    Get port blacklist
 * @access  Private
 */
router.get("/blacklist", portScanController.getBlacklist);

/**
 * @route   POST /api/scan/blacklist
 * @desc    Add port to blacklist
 * @access  Private
 */
router.post("/blacklist", portScanController.addToBlacklist);

/**
 * @route   DELETE /api/scan/blacklist/:port
 * @desc    Remove port from blacklist
 * @access  Private
 */
router.delete("/blacklist/:port", portScanController.removeFromBlacklist);

/**
 * @route   GET /api/scan/stats
 * @desc    Get port scan statistics
 * @access  Private
 */
router.get("/stats", portScanController.getStats);

module.exports = router;
