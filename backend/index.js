require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const winston = require("winston");

// Validate required environment variables
const requiredEnvVars = [
  "PORT",
  "NODE_ENV",
  "JWT_SECRET",
  "VAULT_ENCRYPTION_KEY",
  "LOG_LEVEL",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  process.exit(1);
}

// Import routes
const portScanRoutes = require("./routes/portScan");
const securityRoutes = require("./routes/security");
const anomalyRoutes = require("./routes/anomaly");
const vaultRoutes = require("./routes/vault");
const settingsRoutes = require("./routes/settings");
const networkRoutes = require("./routes/network");

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Create required directories
const dirs = ["logs", "data", "temp", "backup"];
dirs.forEach((dir) => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, "logs", "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(
  morgan(process.env.LOG_FORMAT || "combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
    query: req.query,
    params: req.params,
  });
  next();
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    logger.info(`Response for ${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      responseTime: Date.now() - req._startTime,
    });
    originalSend.call(this, body);
  };
  next();
});

// Routes
app.use("/api/security", securityRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/anomaly", anomalyRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/scan", portScanRoutes);

// Socket.io connection
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`, {
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers["user-agent"],
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  socket.on("error", (error) => {
    logger.error(`Socket error for client ${socket.id}:`, error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    query: req.query,
    params: req.params,
    body: req.body,
  });

  res.status(err.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";

server.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`, {
    nodeEnv: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
});

module.exports = { app, server, io };
