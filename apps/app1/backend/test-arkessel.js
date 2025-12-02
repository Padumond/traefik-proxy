const axios = require("axios");

// Test Arkessel API directly
async function testArkeselDirect() {
  try {
    console.log("🧪 Testing Arkessel API directly...");

    const apiKey = "OkslRjZsNEFoYjc3VVVuJGQ=";
    const baseUrl = "https://sms.arkesel.com/sms/api";

    console.log("API Key (first 10 chars):", apiKey.substring(0, 10) + "...");
    console.log("Base URL:", baseUrl);

    // Test balance check
    console.log("\n📊 Testing balance check...");
    const balanceUrl = `${baseUrl}?action=check-balance&api_key=${apiKey}`;

    const balanceResponse = await axios.get(balanceUrl, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Balance Response:", balanceResponse.data);

    // If first attempt fails, try alternative URL format
    if (balanceResponse.data.code === "102") {
      console.log("\n🔄 Trying alternative URL format...");
      const altBalanceUrl = `https://sms.arkesel.com/api/check-balance?api_key=${apiKey}`;
      console.log(
        "Alternative URL:",
        altBalanceUrl.replace(apiKey, "HIDDEN_API_KEY")
      );

      const altBalanceResponse = await axios.get(altBalanceUrl, {
        timeout: 15000,
        headers: {
          Accept: "application/json",
        },
      });

      console.log("Alternative Balance Response:", altBalanceResponse.data);
    }

    // Test SMS send (to a test number)
    console.log("\n📱 Testing SMS send...");
    const testMessage =
      "Test SMS from Mas3ndi platform - " + new Date().toISOString();
    const testNumber = "+233123456789"; // Replace with a valid test number
    const sender = "Mas3ndi";

    const smsUrl = `${baseUrl}?action=send-sms&api_key=${apiKey}&to=${testNumber}&from=${sender}&sms=${encodeURIComponent(
      testMessage
    )}`;

    console.log(
      "SMS URL (API key hidden):",
      smsUrl.replace(apiKey, "HIDDEN_API_KEY")
    );

    const smsResponse = await axios.get(smsUrl, {
      timeout: 30000,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("SMS Response:", smsResponse.data);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Test phone number validation
function testPhoneValidation() {
  console.log("\n📞 Testing phone number validation...");

  const testNumbers = [
    "+233123456789",
    "233123456789",
    "+1234567890",
    "0123456789",
    "+233 12 345 6789",
    "invalid-number",
  ];

  testNumbers.forEach((number) => {
    // Simple validation logic
    const cleaned = number.replace(/[\s\-\(\)]/g, "");
    const formatted = cleaned.startsWith("+") ? cleaned : "+" + cleaned;
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    const isValid = phoneRegex.test(formatted);

    console.log(
      `${number} -> ${formatted} -> ${isValid ? "✅ Valid" : "❌ Invalid"}`
    );
  });
}

// Test SMS cost calculation
function testCostCalculation() {
  console.log("\n💰 Testing SMS cost calculation...");

  const testMessages = [
    "Hello World!",
    "This is a longer message that might span multiple SMS parts depending on the character encoding and length limits.",
    "Unicode test: 🚀 Hello 世界! 🌍",
    "A".repeat(160), // Exactly 160 characters
    "A".repeat(161), // 161 characters (should be 2 SMS)
  ];

  testMessages.forEach((message, index) => {
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;
    const smsCount = Math.ceil(message.length / maxLength);
    const costPerSms = 0.01;
    const recipients = 1;
    const totalCost = costPerSms * recipients * smsCount;

    console.log(`\nMessage ${index + 1}:`);
    console.log(`  Length: ${message.length} chars`);
    console.log(`  Unicode: ${isUnicode}`);
    console.log(`  SMS Count: ${smsCount}`);
    console.log(`  Cost: $${totalCost.toFixed(4)}`);
    console.log(
      `  Preview: "${message.substring(0, 50)}${
        message.length > 50 ? "..." : ""
      }"`
    );
  });
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting Arkessel Integration Tests\n");
  console.log("=".repeat(50));

  // Test phone validation
  testPhoneValidation();

  // Test cost calculation
  testCostCalculation();

  // Test direct API calls
  await testArkeselDirect();

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests completed!");
}

// Run the tests
runAllTests().catch(console.error);
