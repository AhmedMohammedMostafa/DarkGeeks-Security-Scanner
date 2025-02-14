const express = require("express");
const router = express.Router();
const ruleManager = require("../utils/ruleManager");
const { AppError } = require("../middleware/errorHandler");

const validateRuleType = (req, res, next) => {
  const { type } = req.params;
  const validTypes = ["ports", "ips", "domains"];

  if (!validTypes.includes(type)) {
    return next(
      new AppError(
        `Invalid rule type. Must be one of: ${validTypes.join(", ")}`,
        400
      )
    );
  }
  next();
};

router.get("/", async (req, res, next) => {
  try {
    const [whitelist, blacklist, rules] = await Promise.all([
      ruleManager.getWhitelist(),
      ruleManager.getBlacklist(),
      ruleManager.getRules(),
    ]);

    res.json({
      whitelist,
      blacklist,
      securityRules: rules,
    });
  } catch (error) {
    next(new AppError("Failed to fetch rules", 500));
  }
});

router.get("/whitelist", async (req, res, next) => {
  try {
    const whitelist = await ruleManager.getWhitelist();
    res.json(whitelist);
  } catch (error) {
    next(new AppError("Failed to fetch whitelist", 500));
  }
});

router.get("/blacklist", async (req, res, next) => {
  try {
    const blacklist = await ruleManager.getBlacklist();
    res.json(blacklist);
  } catch (error) {
    next(new AppError("Failed to fetch blacklist", 500));
  }
});

router.post("/whitelist/:type", validateRuleType, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { value } = req.body;

    if (!value) {
      return next(new AppError("Value is required", 400));
    }

    const whitelist = await ruleManager.addToWhitelist(type, value);
    res.json(whitelist);
  } catch (error) {
    next(new AppError(`Failed to add to whitelist: ${error.message}`, 500));
  }
});

router.post("/blacklist/:type", validateRuleType, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { value } = req.body;

    if (!value) {
      return next(new AppError("Value is required", 400));
    }

    const blacklist = await ruleManager.addToBlacklist(type, value);
    res.json(blacklist);
  } catch (error) {
    next(new AppError(`Failed to add to blacklist: ${error.message}`, 500));
  }
});

router.delete("/whitelist/:type", validateRuleType, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { value } = req.body;

    if (!value) {
      return next(new AppError("Value is required", 400));
    }

    const whitelist = await ruleManager.removeFromWhitelist(type, value);
    res.json(whitelist);
  } catch (error) {
    next(
      new AppError(`Failed to remove from whitelist: ${error.message}`, 500)
    );
  }
});

router.delete("/blacklist/:type", validateRuleType, async (req, res, next) => {
  try {
    const { type } = req.params;
    const { value } = req.body;

    if (!value) {
      return next(new AppError("Value is required", 400));
    }

    const blacklist = await ruleManager.removeFromBlacklist(type, value);
    res.json(blacklist);
  } catch (error) {
    next(
      new AppError(`Failed to remove from blacklist: ${error.message}`, 500)
    );
  }
});

router.put("/security", async (req, res, next) => {
  try {
    const newRules = req.body;
    const updatedRules = await ruleManager.updateSecurityRules(newRules);
    res.json(updatedRules);
  } catch (error) {
    next(
      new AppError(`Failed to update security rules: ${error.message}`, 500)
    );
  }
});

router.get("/check/:type/:value", validateRuleType, async (req, res, next) => {
  try {
    const { type, value } = req.params;
    const result = await ruleManager.checkAgainstRules(value, type);
    res.json(result);
  } catch (error) {
    next(new AppError(`Failed to check rules: ${error.message}`, 500));
  }
});

module.exports = router;
