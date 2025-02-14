const express = require("express");
const router = express.Router();
const pwnedChecker = require("../utils/pwnedChecker");
const { AppError } = require("../middleware/errorHandler");

router.post("/check-password", async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return next(new AppError("Password is required", 400));
    }

    const result = await pwnedChecker.checkPassword(password);
    const strengthCheck = await pwnedChecker.checkPasswordStrength(password);

    res.json({
      ...result,
      strength: strengthCheck,
    });
  } catch (error) {
    next(new AppError(`Password check failed: ${error.message}`, 500));
  }
});

// Check if an email has been compromised
router.post("/check-email", async (req, res, next) => {
  try {
    const { email } = req.body;
    const apiKey = process.env.HIBP_API_KEY;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    if (!apiKey) {
      return next(new AppError("HIBP API key is not configured", 500));
    }

    const result = await pwnedChecker.checkEmail(email, apiKey);
    res.json(result);
  } catch (error) {
    next(new AppError(`Email check failed: ${error.message}`, 500));
  }
});

// Check password strength
router.post("/password-strength", async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return next(new AppError("Password is required", 400));
    }

    const result = await pwnedChecker.checkPasswordStrength(password);
    res.json(result);
  } catch (error) {
    next(new AppError(`Password strength check failed: ${error.message}`, 500));
  }
});

module.exports = router;
