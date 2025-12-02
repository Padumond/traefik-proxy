const axios = require("axios");

// Test Arkessel API authentication and balance
async function testArkeselAuth() {
  try {
    console.log("🔐 Testing Arkessel API authentication...");

    const ARKESSEL_API_KEY = "OkslRjZsNEFoYjc3VVVuJGQ=";
    const ARKESSEL_API_URL = "https://sms.arkesel.com/sms/api";

    console.log(`🔑 API Key: ${ARKESSEL_API_KEY.substring(0, 10)}...`);
    console.log(`🌐 API URL: ${ARKESSEL_API_URL}`);

    // Test 1: Check balance (this should work if API key is valid)
    console.log("\n📊 Testing balance check...");
    const balanceUrl = `${ARKESSEL_API_URL}?action=check-balance&api_key=${ARKESSEL_API_KEY}`;
    
    try {
      const balanceResponse = await axios.get(balanceUrl, {
        timeout: 15000,
        headers: {
          Accept: "application/json",
        },
      });

      console.log("✅ Balance check successful!");
      console.log("Status:", balanceResponse.status);
      console.log("Data:", JSON.stringify(balanceResponse.data, null, 2));
    } catch (balanceError) {
      console.log("❌ Balance check failed!");
      if (balanceError.response) {
        console.log("Status:", balanceError.response.status);
        console.log("Data:", balanceError.response.data);
      } else {
        console.log("Error:", balanceError.message);
      }
    }

    // Test 2: Try sending SMS with default sender ID "Mas3ndi"
    console.log("\n📱 Testing SMS with default sender ID 'Mas3ndi'...");
    const recipient = "+233502889775";
    const message = "Test SMS from Mas3ndi platform";
    const defaultSenderId = "Mas3ndi";

    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `${ARKESSEL_API_URL}?action=send-sms&api_key=${ARKESSEL_API_KEY}&to=${recipient}&from=${defaultSenderId}&sms=${encodedMessage}`;

    try {
      const smsResponse = await axios.get(smsUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mas3ndi-SMS-Platform/1.0",
        },
        timeout: 30000,
      });

      console.log("✅ SMS with default sender ID successful!");
      console.log("Status:", smsResponse.status);
      console.log("Data:", JSON.stringify(smsResponse.data, null, 2));
    } catch (smsError) {
      console.log("❌ SMS with default sender ID failed!");
      if (smsError.response) {
        console.log("Status:", smsError.response.status);
        console.log("Data:", smsError.response.data);
      } else {
        console.log("Error:", smsError.message);
      }
    }

    // Test 3: Try sending SMS with TESTCO sender ID
    console.log("\n📱 Testing SMS with TESTCO sender ID...");
    const testcoSenderId = "TESTCO";

    const testcoSmsUrl = `${ARKESSEL_API_URL}?action=send-sms&api_key=${ARKESSEL_API_KEY}&to=${recipient}&from=${testcoSenderId}&sms=${encodedMessage}`;

    try {
      const testcoResponse = await axios.get(testcoSmsUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mas3ndi-SMS-Platform/1.0",
        },
        timeout: 30000,
      });

      console.log("✅ SMS with TESTCO sender ID successful!");
      console.log("Status:", testcoResponse.status);
      console.log("Data:", JSON.stringify(testcoResponse.data, null, 2));
    } catch (testcoError) {
      console.log("❌ SMS with TESTCO sender ID failed!");
      if (testcoError.response) {
        console.log("Status:", testcoError.response.status);
        console.log("Data:", testcoError.response.data);
      } else {
        console.log("Error:", testcoError.message);
      }
    }

    // Test 4: Check sender IDs (if this endpoint exists)
    console.log("\n📋 Testing sender IDs list...");
    const senderIdsUrl = `${ARKESSEL_API_URL}?action=sender-ids&api_key=${ARKESSEL_API_KEY}`;

    try {
      const senderIdsResponse = await axios.get(senderIdsUrl, {
        timeout: 15000,
        headers: {
          Accept: "application/json",
        },
      });

      console.log("✅ Sender IDs check successful!");
      console.log("Status:", senderIdsResponse.status);
      console.log("Data:", JSON.stringify(senderIdsResponse.data, null, 2));
    } catch (senderIdsError) {
      console.log("❌ Sender IDs check failed (this might be expected if endpoint doesn't exist)!");
      if (senderIdsError.response) {
        console.log("Status:", senderIdsError.response.status);
        console.log("Data:", senderIdsError.response.data);
      } else {
        console.log("Error:", senderIdsError.message);
      }
    }

  } catch (error) {
    console.error("❌ General error:", error.message);
  }
}

testArkeselAuth();
