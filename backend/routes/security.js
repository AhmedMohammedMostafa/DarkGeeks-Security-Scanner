const express = require("express");
const router = express.Router();
const securityController = require("../controllers/securityController");

/**
 * @route   GET /api/security/status
 * @desc    Get current security status
 * @access  Private
 */
router.get("/status", securityController.getSecurityStatus);

/**
 * @route   GET /api/security/malware-scan
 * @desc    Scan for malware in default directory
 * @access  Private
 */
router.get("/malware-scan", securityController.scanForMalware);

/**
 * @route   GET /api/security/hack-detection
 * @desc    Check for signs of hacking attempts
 * @access  Private
 */
router.get("/hack-detection", securityController.detectHackingAttempts);

/**
 * @route   GET /api/security/vulnerability-check
 * @desc    Check for system vulnerabilities
 * @access  Private
 */
router.get("/vulnerability-check", securityController.checkVulnerabilities);

/**
 * @route   POST /api/security/pwned-check
 * @desc    Check if email has been pwned using Have I Been Pwned API
 * @access  Private
 */
router.post("/pwned-check", securityController.checkPwnedEmail);

/**
 * @route   POST /api/security/password-check
 * @desc    Check if password has been compromised
 * @access  Private
 */
router.post("/password-check", securityController.checkPwnedPassword);

/**
 * @route   GET /api/security/alerts
 * @desc    Get security alerts
 * @access  Private
 */
router.get("/alerts", securityController.getSecurityAlerts);

/**
 * @route   POST /api/security/alerts/dismiss/:id
 * @desc    Dismiss a security alert
 * @access  Private
 */
router.post("/alerts/dismiss/:id", securityController.dismissAlert);

module.exports = router;
