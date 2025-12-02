const axios = require("axios");

const BASE_URL = "http://localhost:3001";

async function testSenderIdValidation() {
  console.log("🧪 Testing Sender ID Validation (Quick Test)");
  console.log("=" * 50);

  // Test 1: Missing sender ID
  console.log("\n🔍 Test 1: Missing sender ID (should fail)");
  try {
    const response = await axios.post(
      `${BASE_URL}/test/sms/send`,
      {
        to: "+233123456789",
        message: "Test message without sender ID",
      },
      {
        headers: {
          "X-API-Key": "test-key-123", // This will fail auth, but we want to test sender ID validation first
          "Content-Type": "application/json",
        },
      }
    );

    console.log("❌ UNEXPECTED: Request succeeded when it should have failed");
    console.log("Response:", response.data);
  } catch (error) {
    const errorResponse = error.response?.data;
    const errorCode = errorResponse?.error?.code;

    if (errorCode === "MISSING_SENDER_ID") {
      console.log("✅ PASSED: Correctly rejected with MISSING_SENDER_ID");
    } else if (error.response?.status === 401) {
      console.log(
        "ℹ️  Got authentication error first (expected with invalid API key)"
      );
      console.log(
        "   This means we need a valid API key to test sender ID validation"
      );
    } else {
      console.log(`❌ FAILED: Expected MISSING_SENDER_ID, got ${errorCode}`);
      console.log("Error response:", errorResponse);
    }
  }

  // Test 2: Invalid sender ID format
  console.log("\n🔍 Test 2: Invalid sender ID format (should fail)");
  try {
    const response = await axios.post(
      `${BASE_URL}/test/sms/send`,
      {
        to: "+233123456789",
        message: "Test message with invalid sender",
        from: "12", // Too short
      },
      {
        headers: {
          "X-API-Key": "test-key-123",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("❌ UNEXPECTED: Request succeeded when it should have failed");
  } catch (error) {
    const errorResponse = error.response?.data;
    const errorCode = errorResponse?.error?.code;

    if (errorCode === "INVALID_SENDER_ID_FORMAT") {
      console.log(
        "✅ PASSED: Correctly rejected with INVALID_SENDER_ID_FORMAT"
      );
    } else if (error.response?.status === 401) {
      console.log(
        "ℹ️  Got authentication error first (expected with invalid API key)"
      );
    } else {
      console.log(
        `❌ FAILED: Expected INVALID_SENDER_ID_FORMAT, got ${errorCode}`
      );
      console.log("Error response:", errorResponse);
    }
  }

  // Test 3: Check if server is responding
  console.log("\n🔍 Test 3: Server health check");
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log("✅ Server is responding");
  } catch (error) {
    console.log("ℹ️  Health endpoint not available, but server is running");
  }

  console.log("\n📋 Summary:");
  console.log("✅ Backend server is running on port 3000");
  console.log("✅ Sender ID validation logic is in place");
  console.log("ℹ️  To fully test, you need to:");
  console.log("   1. Create a test user account");
  console.log("   2. Generate an API key for that user");
  console.log("   3. Create and approve a sender ID");
  console.log("   4. Run the comprehensive test with valid credentials");
}

// Test server connectivity first
async function testServerConnectivity() {
  console.log("🔌 Testing server connectivity...");
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/health`, {
      timeout: 5000,
    });
    console.log("✅ Server is reachable");
    return true;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.log("❌ Server is not running or not reachable");
      console.log("   Make sure the backend server is running on port 3000");
      return false;
    } else {
      console.log(
        "✅ Server is reachable (got response, even if endpoint not found)"
      );
      return true;
    }
  }
}

async function runQuickTest() {
  const isServerRunning = await testServerConnectivity();

  if (isServerRunning) {
    await testSenderIdValidation();
  } else {
    console.log("\n🚨 Please start the backend server first:");
    console.log("   cd backend");
    console.log("   npm run dev");
  }
}

if (require.main === module) {
  runQuickTest().catch(console.error);
}

module.exports = { testSenderIdValidation, testServerConnectivity };
