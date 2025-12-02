import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

// Load environment variables before importing routes
dotenv.config();

// Import and initialize Prisma client
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

// Import middleware - we need to import these first
import { errorHandler } from "./middleware/error.middleware";
import { authenticate } from "./middleware/auth.middleware";

// Import SMS queue worker
import { initSmsQueueWorker } from "./services/queue.service";

// Import routes after middleware is set up
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import smsRoutes from "./routes/sms.routes";
import smsScheduleRoutes from "./routes/smsSchedule.routes";
import senderIdRoutes from "./routes/senderId.routes";
import deliveryWebhookRoutes from "./routes/deliveryWebhook.routes";
import smsCampaignRoutes from "./routes/smsCampaign.routes";
import { DeliverySyncJob } from "./jobs/deliverySync.job";
import { FileUploadService } from "./services/fileUpload.service";
import walletRoutes from "./routes/wallet.routes";
// import enhancedWalletRoutes from "./routes/enhancedWallet.routes"; // Temporarily disabled due to compilation issues
// import clientApiRoutes from "./routes/clientApi.routes";
// import clientOnboardingRoutes from "./routes/clientOnboarding.routes";
// import apiGatewayRoutes from "./routes/apiGateway.routes";
import messageTemplateRoutes from "./routes/messageTemplate.routes";
import contactGroupRoutes from "./routes/contactGroup.routes";
import contactRoutes from "./routes/contact.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import testRoutes from "./routes/test.routes";
import smsPackagesRoutes from "./routes/smsPackages.routes";
import adminRoutes from "./routes/admin.routes";
// import apiKeyRoutes from "./routes/apiKey.routes"; // Temporarily disabled due to express-validator issues
// import deliveryReportsRoutes from "./routes/deliveryReports.routes"; // Temporarily disabled due to controller issues
import paymentRoutes from "./routes/payment.routes";
// import resellerRoutes from "./routes/reseller.routes";
// import deliveryRoutes from "./routes/delivery.routes";
// import deliveryReportsRoutes from "./routes/deliveryReports.routes";
// import apiKeyRoutes from "./routes/apiKey.routes";
// Enhanced features temporarily disabled for basic testing

import http from "http";

// Initialize express app
const app: Application = express();
const PORT = process.env.PORT || 3000;

let server: http.Server; // Declare at module scope

// Import security middleware
import { applySecurityMiddleware } from "./middleware/security.middleware";

// Apply security middleware (includes helmet, cors, rate limiting)
applySecurityMiddleware(app);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (after body parsing)
import { apiLogger } from "./utils/logger";

app.use((req, res, next) => {
  const start = Date.now();

  // Log request
  apiLogger.request(req.method, req.path);

  // Log request body only in development
  if (process.env.NODE_ENV === "development") {
    apiLogger.debug("Request body:", req.body);
  }

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    apiLogger.request(req.method, req.path, res.statusCode, duration);
  });

  next();
});

// Static file serving for uploads
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Mas3ndi API is running" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/sms-schedule", smsScheduleRoutes);
app.use("/api/sender-ids", senderIdRoutes);
app.use("/api/webhooks/delivery", deliveryWebhookRoutes);
app.use("/api/campaigns", smsCampaignRoutes);
app.use("/api/wallet", walletRoutes);
// app.use("/api/wallet-enhanced", enhancedWalletRoutes); // Temporarily disabled due to compilation issues
// app.use("/api/client-api", clientApiRoutes);
// app.use("/api/onboarding", clientOnboardingRoutes);
app.use("/api/templates", messageTemplateRoutes);
app.use("/api/contacts/groups", contactGroupRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/test", testRoutes);
app.use("/api/sms-packages", smsPackagesRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/api-keys", apiKeyRoutes); // Temporarily disabled due to express-validator issues
// app.use("/api/delivery-reports", deliveryReportsRoutes); // Temporarily disabled due to controller issues
app.use("/api/payments", paymentRoutes);
// app.use("/api/reseller", resellerRoutes);
// app.use("/api/delivery", deliveryRoutes);
// Enhanced routes temporarily disabled for basic testing

// API Gateway routes (for client APIs) - temporarily disabled due to path-to-regexp issue
// app.use("/gateway", apiGatewayRoutes);

// Temporary direct test route for client SMS (for testing sender ID validation)
import { ClientSmsController } from "./controllers/clientSms.controller";
app.post("/test/client/sms/send", (req, res, next) => {
  // Mock the clientApiInfo that would normally be set by API key middleware
  (req as any).clientApiInfo = { userId: "test-user-id" };
  ClientSmsController.sendSms(req, res, next);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Mas3ndi API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Error handling middleware
app.use(errorHandler);

// Handle 404 routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Initialize SMS queue worker
let smsWorker: any;
if (process.env.NODE_ENV !== "test") {
  smsWorker = initSmsQueueWorker();
  console.log("SMS queue worker initialized");
}

// Check database connection before starting the server
import { logger } from "./utils/logger";

prisma
  .$connect()
  .then(() => {
    logger.info("✅ Connected to the database");
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);

      // Initialize file upload service
      FileUploadService.init();
      logger.info("✅ File upload service initialized");

      // Start background jobs
      if (process.env.NODE_ENV !== "test") {
        // DeliverySyncJob.start(); // Temporarily disabled for testing
        logger.info("✅ Background sync jobs started");
      }
    });
    // Attach server to app for graceful shutdown
    (app as any).server = server;
  })
  .catch((err) => {
    logger.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  });

// Graceful shutdown handling
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

function gracefulShutdown() {
  console.log("Received shutdown signal, closing server and connections...");

  // Close the server first
  server.close(async () => {
    console.log("Server closed");

    // Close the SMS queue worker if it exists
    if (smsWorker) {
      await smsWorker.close();
      console.log("SMS queue worker closed");
    }

    // Close the Prisma client
    await prisma.$disconnect();
    console.log("Database connections closed");

    process.exit(0);
  });
}

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
