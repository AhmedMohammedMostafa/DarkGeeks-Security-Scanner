const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Private
 */
router.get("/", settingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update settings
 * @access  Private
 */
router.put("/", settingsController.updateSettings);

module.exports = router;
