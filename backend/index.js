const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const dotenv = require("dotenv");
const winston = require("winston");
const { errorHandler } = require("./middleware/errorHandler");

const scanRoutes = require("./routes/scanRoutes");
const malwareRoutes = require("./routes/malwareRoutes");
const ruleRoutes = require("./routes/ruleRoutes");
const pwnedRoutes = require("./routes/pwnedRoutes");
const vaultRoutes = require("./routes/vaultRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);
app.use(express.json());

app.use("/api/scan", scanRoutes);
app.use("/api/malware", malwareRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/pwned", pwnedRoutes);
app.use("/api/vault", vaultRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

io.on("connection", (socket) => {
  logger.info("New client connected");

  socket.on("disconnect", () => {
    logger.info("Client disconnected");
  });

  socket.on("start_port_scan", async (data) => {
    try {
      const { host, startPort, endPort } = data;
      const portScanner = require("./utils/portScanner");

      socket.emit("scan_update", { status: "initializing", progress: 0 });

      const results = await portScanner.scanRange(
        host,
        startPort,
        endPort,
        (progress) => {
          socket.emit("scan_update", {
            status: "scanning",
            progress: Math.floor((progress.current / progress.total) * 100),
            currentPort: progress.current,
            result: progress.result,
          });
        }
      );

      socket.emit("scan_complete", results);
    } catch (error) {
      logger.error("Port scan error:", error);
      socket.emit("scan_error", { message: error.message });
    }
  });

  socket.on("start_malware_scan", async (data) => {
    try {
      const { path } = data;
      const malwareDetector = require("./utils/malwareDetector");

      socket.emit("scan_update", { status: "initializing", type: "malware" });
      const results = await malwareDetector.scanDirectory(path);
      socket.emit("scan_complete", { type: "malware", results });
    } catch (error) {
      logger.error("Malware scan error:", error);
      socket.emit("scan_error", { type: "malware", message: error.message });
    }
  });

  socket.on("vault_operation", async (data) => {
    try {
      const { operation, identifier, payload } = data;
      const secureVault = require("./utils/secureVault");

      let result;
      switch (operation) {
        case "store":
          result = await secureVault.store(identifier, payload);
          break;
        case "retrieve":
          result = await secureVault.retrieve(identifier);
          break;
        case "delete":
          result = await secureVault.delete(identifier);
          break;
        default:
          throw new Error("Invalid vault operation");
      }

      socket.emit("vault_update", { operation, result });
    } catch (error) {
      logger.error("Vault operation error:", error);
      socket.emit("vault_error", { message: error.message });
    }
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
