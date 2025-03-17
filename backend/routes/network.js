const express = require("express");
const router = express.Router();
const networkController = require("../controllers/networkController");

/**
 * @route   GET /api/network/traffic
 * @desc    Get current network traffic data and history
 * @access  Private
 */
router.get("/traffic", networkController.getNetworkTraffic);

/**
 * @route   GET /api/network/stats
 * @desc    Get detailed network statistics
 * @access  Private
 */
router.get("/stats", networkController.getNetworkStats);

/**
 * @route   GET /api/network/top-talkers
 * @desc    Get top network talkers
 * @access  Private
 */
router.get("/top-talkers", networkController.getTopTalkers);

module.exports = router;
