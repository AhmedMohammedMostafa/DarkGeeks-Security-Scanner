const express = require("express");
const router = express.Router();
const portScanner = require("../utils/portScanner");

const validateScanParams = (req, res, next) => {
  const { host, startPort, endPort } = req.body;

  if (!host) {
    return res.status(400).json({ error: "Host is required" });
  }

  if (startPort && endPort) {
    if (startPort < 1 || startPort > 65535 || endPort < 1 || endPort > 65535) {
      return res
        .status(400)
        .json({ error: "Ports must be between 1 and 65535" });
    }
    if (startPort > endPort) {
      return res
        .status(400)
        .json({ error: "Start port must be less than or equal to end port" });
    }
  }

  next();
};

router.post("/quick", validateScanParams, async (req, res) => {
  try {
    const { host } = req.body;
    const results = await portScanner.quickScan(host);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Scan failed", message: error.message });
  }
});

router.post("/range", validateScanParams, async (req, res) => {
  try {
    const { host, startPort, endPort } = req.body;
    const results = await portScanner.scanRange(
      host,
      parseInt(startPort),
      parseInt(endPort)
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Scan failed", message: error.message });
  }
});

router.get("/history", (req, res) => {
  // TODO: Implement scan history retrieval
  res.status(501).json({ message: "Scan history feature coming soon" });
});

module.exports = router;
