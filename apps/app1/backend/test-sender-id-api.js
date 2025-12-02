const axios = require("axios");

const BASE_URL = "http://localhost:3000";

async function testSenderIdAPI() {
  console.log("🧪 Testing Sender ID API Endpoints");
  console.log("=" * 50);

  // First, let's login as the test client to get a token
  console.log("\n🔐 Step 1: Login as test client");
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "client@mas3ndi.com",
      password: "Client123!",
    });

    console.log("Login response:", JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    console.log("✅ Login successful, got token:", token ? "YES" : "NO");

    // Test the sender IDs endpoint
    console.log("\n📋 Step 2: Test GET /api/sender-ids");
    try {
      const senderIdsResponse = await axios.get(`${BASE_URL}/api/sender-ids`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ GET /api/sender-ids successful");
      console.log("Response status:", senderIdsResponse.status);
      console.log(
        "Response data:",
        JSON.stringify(senderIdsResponse.data, null, 2)
      );
    } catch (error) {
      console.log("❌ GET /api/sender-ids failed");
      console.log("Status:", error.response?.status);
      console.log("Error:", error.response?.data || error.message);
    }

    // Test creating a sender ID
    console.log("\n📝 Step 3: Test POST /api/sender-ids (Create sender ID)");
    try {
      const createResponse = await axios.post(
        `${BASE_URL}/api/sender-ids`,
        {
          senderId: "TESTID123",
          purpose:
            "This is a test sender ID for testing the API endpoint functionality. It should be at least 50 characters long to pass validation.",
          sampleMessage: "This is a sample message from TESTID123",
          companyName: "Test Company",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ POST /api/sender-ids successful");
      console.log("Response status:", createResponse.status);
      console.log(
        "Response data:",
        JSON.stringify(createResponse.data, null, 2)
      );
    } catch (error) {
      console.log("❌ POST /api/sender-ids failed");
      console.log("Status:", error.response?.status);
      console.log("Error:", error.response?.data || error.message);
    }

    // Test getting sender IDs again after creation
    console.log("\n📋 Step 4: Test GET /api/sender-ids again (after creation)");
    try {
      const senderIdsResponse2 = await axios.get(`${BASE_URL}/api/sender-ids`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ GET /api/sender-ids successful");
      console.log("Response status:", senderIdsResponse2.status);
      console.log(
        "Number of sender IDs:",
        senderIdsResponse2.data.data?.length || 0
      );
      console.log(
        "Response data:",
        JSON.stringify(senderIdsResponse2.data, null, 2)
      );
    } catch (error) {
      console.log("❌ GET /api/sender-ids failed");
      console.log("Status:", error.response?.status);
      console.log("Error:", error.response?.data || error.message);
    }
  } catch (error) {
    console.log("❌ Login failed");
    console.log("Status:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);
    return;
  }

  console.log("\n🎯 Summary:");
  console.log("- Tested login functionality");
  console.log("- Tested GET /api/sender-ids endpoint");
  console.log("- Tested POST /api/sender-ids endpoint");
  console.log("- Verified data persistence");
}

// Also test admin endpoints
async function testAdminSenderIdAPI() {
  console.log("\n🔧 Testing Admin Sender ID API Endpoints");
  console.log("=" * 50);

  // Login as admin
  console.log("\n🔐 Step 1: Login as admin");
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "admin@mas3ndi.com",
      password: "Admin123!",
    });

    console.log(
      "Admin login response:",
      JSON.stringify(loginResponse.data, null, 2)
    );
    const token = loginResponse.data.token || loginResponse.data.data?.token;
    console.log("✅ Admin login successful, got token:", token ? "YES" : "NO");

    // Test admin sender IDs endpoint
    console.log("\n📋 Step 2: Test GET /api/sender-ids/all (Admin endpoint)");
    try {
      const adminSenderIdsResponse = await axios.get(
        `${BASE_URL}/api/sender-ids/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ GET /api/sender-ids/all successful");
      console.log("Response status:", adminSenderIdsResponse.status);
      console.log(
        "Number of sender IDs:",
        adminSenderIdsResponse.data.data?.length || 0
      );
      console.log(
        "Response data:",
        JSON.stringify(adminSenderIdsResponse.data, null, 2)
      );
    } catch (error) {
      console.log("❌ GET /api/sender-ids/all failed");
      console.log("Status:", error.response?.status);
      console.log("Error:", error.response?.data || error.message);
    }
  } catch (error) {
    console.log("❌ Admin login failed");
    console.log("Status:", error.response?.status);
    console.log("Error:", error.response?.data || error.message);
  }
}

async function runAllTests() {
  await testSenderIdAPI();
  await testAdminSenderIdAPI();
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testSenderIdAPI, testAdminSenderIdAPI };
