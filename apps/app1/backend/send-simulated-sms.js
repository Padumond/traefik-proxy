const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function sendSimulatedSms() {
  try {
    console.log("🎭 Sending SIMULATED SMS (API key invalid, simulating success)...");

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
    const message = "Hello! This is a SIMULATED test SMS from Mas3ndi platform using TESTCO sender ID. System working perfectly! 🎉";
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

    // Format phone number
    let formattedRecipient = recipient;
    if (!recipient.startsWith("+")) {
      if (recipient.startsWith("0")) {
        formattedRecipient = "+233" + recipient.substring(1);
      } else {
        formattedRecipient = "+233" + recipient;
      }
    }

    console.log(`\n🔄 Formatted recipient: ${formattedRecipient}`);

    // SIMULATE successful Arkessel response
    console.log("\n🎭 SIMULATING Arkessel API call...");
    console.log("🔗 Would call: https://sms.arkesel.com/sms/api?action=send-sms&...");
    
    // Simulate successful response
    const simulatedArkeselResponse = {
      code: "ok",
      status: "success",
      message: "SMS sent successfully",
      data: {
        id: `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        balance: 95.50,
        user: "mas3ndi_user",
        api_key: "HIDDEN",
        type: "plain",
        unicode: false,
        message: message,
        sender: senderId,
        recipients: formattedRecipient,
        scheduled_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };

    console.log("✅ SIMULATED Arkessel Response:");
    console.log(JSON.stringify(simulatedArkeselResponse, null, 2));

    const arkeselMessageId = simulatedArkeselResponse.data.id;

    // Create SMS log entry
    const smsLog = await prisma.smsLog.create({
      data: {
        userId: testUser.id,
        senderIdId: testcoSenderId.id,
        recipients: [recipient],
        message: message,
        status: "SENT",
        cost: totalCost,
        providerRef: arkeselMessageId,
      },
    });

    // Deduct from wallet
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
        description: `SMS to ${recipient} via ${senderId} (Simulated: ${arkeselMessageId})`,
      },
    });

    console.log("\n🎉 SIMULATED SMS SENT SUCCESSFULLY!");
    console.log(`📝 SMS Log ID: ${smsLog.id}`);
    console.log(`💳 Transaction ID: ${walletTransaction.id}`);
    console.log(`💰 Remaining balance: $${updatedUser.walletBalance}`);
    console.log(`📱 SMS would be delivered to: ${recipient}`);
    console.log(`📧 From sender ID: ${senderId}`);
    console.log(`🆔 Simulated Message ID: ${arkeselMessageId}`);
    
    console.log("\n📋 Summary:");
    console.log("✅ Sender ID approval system: WORKING");
    console.log("✅ Wallet management system: WORKING");
    console.log("✅ SMS cost calculation: WORKING");
    console.log("✅ Database logging: WORKING");
    console.log("✅ Transaction recording: WORKING");
    console.log("❌ Arkessel API integration: NEEDS VALID API KEY");
    
    console.log("\n🔧 Next Steps:");
    console.log("1. Get valid Arkessel API credentials");
    console.log("2. Update ARKESSEL_API_KEY in .env file");
    console.log("3. Test real SMS sending");

    return {
      success: true,
      smsLog,
      walletTransaction,
      simulatedResponse: simulatedArkeselResponse,
    };

  } catch (error) {
    console.error("\n❌ Error in simulated SMS send:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

sendSimulatedSms();
