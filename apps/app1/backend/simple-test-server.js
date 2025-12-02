console.log("Starting simple test server...");

const express = require("express");
console.log("Express loaded");

const cors = require("cors");
console.log("CORS loaded");

const app = express();
const PORT = 3001; // Use different port to avoid conflicts

console.log("Express app created");

// Middleware
app.use(cors());
app.use(express.json());

// Simple test endpoint to validate sender ID logic
app.post("/test/sms/send", (req, res) => {
  const { to, message, from } = req.body;

  console.log("Received SMS request:", { to, message, from });

  // Test our sender ID validation logic

  // Validate required fields
  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_PARAMETERS",
        message: "Required parameters: to, message, from",
      },
    });
  }

  // Validate sender ID is provided (required for white-label clients)
  if (!from) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_SENDER_ID",
        message:
          "Sender ID (from) is required. Please use your approved sender ID.",
      },
    });
  }

  // Validate sender ID format
  if (!/^[A-Za-z0-9]{3,11}$/.test(from)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_SENDER_ID_FORMAT",
        message: "Sender ID must be 3-11 alphanumeric characters",
      },
    });
  }

  // If we get here, the basic validation passed
  res.status(200).json({
    success: true,
    message: "Sender ID validation passed",
    data: {
      to,
      message,
      from,
      validation_status: "PASSED",
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "success",
    message: "Simple test server is running",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`📋 Test endpoint: http://localhost:${PORT}/test/sms/send`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
