const express = require("express");
const router = express.Router();
const secureVault = require("../utils/secureVault");
const { AppError } = require("../middleware/errorHandler");

const validateIdentifier = (req, res, next) => {
  const { identifier } = req.params;
  if (!identifier) {
    return next(new AppError("Identifier is required", 400));
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
    return next(new AppError("Invalid identifier format", 400));
  }
  next();
};

router.post("/:identifier", validateIdentifier, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
      return next(new AppError("Data is required", 400));
    }

    const result = await secureVault.store(identifier, data);
    res.json(result);
  } catch (error) {
    next(new AppError(`Failed to store data: ${error.message}`, 500));
  }
});

router.get("/:identifier", validateIdentifier, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const data = await secureVault.retrieve(identifier);
    res.json(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return next(new AppError("Data not found", 404));
    }
    next(new AppError(`Failed to retrieve data: ${error.message}`, 500));
  }
});

router.delete("/:identifier", validateIdentifier, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const result = await secureVault.delete(identifier);
    res.json(result);
  } catch (error) {
    if (error.code === "ENOENT") {
      return next(new AppError("Data not found", 404));
    }
    next(new AppError(`Failed to delete data: ${error.message}`, 500));
  }
});

router.get("/", async (req, res, next) => {
  try {
    const items = await secureVault.list();
    res.json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(new AppError(`Failed to list vault contents: ${error.message}`, 500));
  }
});

router.post("/rotate-key", async (req, res, next) => {
  try {
    const result = await secureVault.changeEncryptionKey();
    res.json(result);
  } catch (error) {
    next(
      new AppError(`Failed to rotate encryption key: ${error.message}`, 500)
    );
  }
});

module.exports = router;
