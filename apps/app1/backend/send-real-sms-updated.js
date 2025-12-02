require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

async function sendRealSmsUpdated() {
  try {
    console.log("🚀 Sending REAL SMS with UPDATED API credentials...");

    // Read API credentials from environment
    const ARKESSEL_API_KEY = process.env.ARKESSEL_API_KEY;
    const ARKESSEL_API_URL = process.env.ARKESSEL_API_URL || "https://sms.arkesel.com/sms/api";

    console.log(`🔑 API Key: ${ARKESSEL_API_KEY ? ARKESSEL_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`🌐 API URL: ${ARKESSEL_API_URL}`);

    if (!ARKESSEL_API_KEY) {
      console.log("❌ ARKESSEL_API_KEY not found in environment variables");
      return;
    }

    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    if (!testUser) {
      console.log("❌ Test user not found");
      return;
    }

    // Find the TESTCO sender ID
    const testcoSenderId = await prisma.senderID.findFirst({
      where: {
        userId: testUser.id,
        senderId: "TESTCO",
        status: "APPROVED",
      },
    });

    if (!testcoSenderId) {
      console.log("❌ TESTCO sender ID not found or not approved");
      return;
    }

    console.log(`📧 User: ${testUser.email}`);
    console.log(`💰 Wallet Balance: $${testUser.walletBalance}`);
    console.log(`✅ Sender ID: ${testcoSenderId.senderId} (${testcoSenderId.status})`);

    // SMS details
    const recipient = "0502889775";
    const message = "Hello! This is a REAL test SMS from Mas3ndi platform using TESTCO sender ID. Integration successful! 🎉";
    const senderId = "TESTCO";

    console.log("\n📱 SMS Details:");
    console.log(`📞 To: ${recipient}`);
    console.log(`📧 From: ${senderId}`);
    console.log(`💬 Message: ${message}`);
    console.log(`📏 Length: ${message.length} characters`);

    // Calculate cost
    const smsCount = Math.ceil(message.length / 160);
    const costPerSms = 0.01;
    const totalCost = costPerSms * smsCount;

    console.log(`\n💰 Cost Analysis:`);
    console.log(`   - SMS parts: ${smsCount}`);
    console.log(`   - Cost per SMS: $${costPerSms}`);
    console.log(`   - Total cost: $${totalCost}`);

    // Check balance
    if (testUser.walletBalance < totalCost) {
      console.log(`❌ Insufficient balance! Need $${totalCost}, have $${testUser.walletBalance}`);
      return;
    }

    console.log(`✅ Sufficient balance for SMS`);

    // Format phone number for Arkessel (ensure it starts with country code)
    let formattedRecipient = recipient;
    if (!recipient.startsWith("+")) {
      // Assuming Ghana (+233) based on the number format
      if (recipient.startsWith("0")) {
        formattedRecipient = "+233" + recipient.substring(1);
      } else {
        formattedRecipient = "+233" + recipient;
      }
    }

    console.log(`\n🔄 Formatted recipient: ${formattedRecipient}`);

    // First, let's test the balance to verify API key works
    console.log("\n📊 Testing API key with balance check...");
    const balanceUrl = `${ARKESSEL_API_URL}?action=check-balance&api_key=${ARKESSEL_API_KEY}`;
    
    try {
      const balanceResponse = await axios.get(balanceUrl, {
        timeout: 15000,
        headers: {
          Accept: "application/json",
        },
      });

      console.log("✅ Balance check successful!");
      console.log("Balance Response:", JSON.stringify(balanceResponse.data, null, 2));
    } catch (balanceError) {
      console.log("❌ Balance check failed!");
      if (balanceError.response) {
        console.log("Status:", balanceError.response.status);
        console.log("Data:", balanceError.response.data);
        
        if (balanceError.response.data?.code === '102') {
          console.log("🚨 API Key is still invalid. Please check your .env file.");
          return;
        }
      } else {
        console.log("Error:", balanceError.message);
      }
    }

    // Prepare Arkessel API call for SMS
    const encodedMessage = encodeURIComponent(message);
    const apiUrl = `${ARKESSEL_API_URL}?action=send-sms&api_key=${ARKESSEL_API_KEY}&to=${formattedRecipient}&from=${senderId}&sms=${encodedMessage}`;

    console.log("\n🌐 Calling Arkessel SMS API...");
    console.log(`🔗 URL: ${ARKESSEL_API_URL}?action=send-sms&api_key=${ARKESSEL_API_KEY.substring(0, 10)}...&to=${formattedRecipient}&from=${senderId}&sms=[message]`);

    // Make the API call
    const response = await axios.get(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mas3ndi-SMS-Platform/1.0",
      },
      timeout: 30000, // 30 seconds timeout
    });

    console.log("\n📡 Arkessel SMS Response:");
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));

    // Check if the SMS was sent successfully
    const responseData = response.data;
    let isSuccess = false;
    let arkeselMessageId = null;

    if (responseData.code === "ok" || responseData.status === "success") {
      isSuccess = true;
      arkeselMessageId = responseData.data?.id || `arkessel_${Date.now()}`;
      console.log("✅ SMS sent successfully through Arkessel!");
    } else {
      console.log("❌ SMS failed to send through Arkessel");
      console.log("Error:", responseData.message || "Unknown error");
    }

    // Create SMS log entry
    const smsLog = await prisma.smsLog.create({
      data: {
        userId: testUser.id,
        senderIdId: testcoSenderId.id,
        recipients: [recipient],
        message: message,
        status: isSuccess ? "SENT" : "FAILED",
        cost: isSuccess ? totalCost : 0,
        providerRef: arkeselMessageId,
      },
    });

    if (isSuccess) {
      // Deduct from wallet only if SMS was sent successfully
      const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: {
          walletBalance: {
            decrement: totalCost,
          },
        },
      });

      // Create wallet transaction
      const walletTransaction = await prisma.walletTransaction.create({
        data: {
          userId: testUser.id,
          amount: totalCost,
          type: "DEBIT",
          description: `SMS to ${recipient} via ${senderId} (Arkessel: ${arkeselMessageId})`,
        },
      });

      console.log("\n🎉 REAL SMS SENT SUCCESSFULLY!");
      console.log(`📝 SMS Log ID: ${smsLog.id}`);
      console.log(`💳 Transaction ID: ${walletTransaction.id}`);
      console.log(`💰 Remaining balance: $${updatedUser.walletBalance}`);
      console.log(`📱 SMS delivered to: ${recipient}`);
      console.log(`📧 From sender ID: ${senderId}`);
      console.log(`🆔 Arkessel Message ID: ${arkeselMessageId}`);
    } else {
      console.log("\n❌ SMS FAILED TO SEND");
      console.log(`📝 Failed SMS Log ID: ${smsLog.id}`);
      console.log("💰 No charges applied due to failure");
    }

    return {
      success: isSuccess,
      smsLog,
      arkeselResponse: responseData,
    };

  } catch (error) {
    console.error("\n❌ Error sending real SMS:", error);
    
    if (error.response) {
      console.error("API Response Status:", error.response.status);
      console.error("API Response Data:", error.response.data);
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

sendRealSmsUpdated();
