const express = require("express");
const router = express.Router();
const anomalyController = require("../controllers/anomalyController");

/**
 * @route   GET /api/anomaly/detect
 * @desc    Detect anomalies in network traffic
 * @access  Private
 */
router.get("/detect", anomalyController.detectAnomalies);

/**
 * @route   GET /api/anomaly/network-traffic
 * @desc    Get current network traffic data
 * @access  Private
 */
router.get("/network-traffic", anomalyController.getNetworkTraffic);

/**
 * @route   GET /api/anomaly/history
 * @desc    Get anomaly detection history
 * @access  Private
 */
router.get("/history", anomalyController.getAnomalyHistory);

/**
 * @route   POST /api/anomaly/threshold
 * @desc    Update anomaly detection threshold
 * @access  Private
 */
router.post("/threshold", anomalyController.updateThreshold);

/**
 * @route   GET /api/anomaly/settings
 * @desc    Get anomaly detection settings
 * @access  Private
 */
router.get("/settings", anomalyController.getSettings);

/**
 * @route   POST /api/anomaly/settings
 * @desc    Update anomaly detection settings
 * @access  Private
 */
router.post("/settings", anomalyController.updateSettings);

module.exports = router;
