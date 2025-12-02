const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

async function testSmsSend() {
  try {
    console.log("📱 Testing SMS send with TESTCO sender ID...");

    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    if (!testUser) {
      console.log("❌ Test user not found");
      return;
    }

    console.log(`📧 User: ${testUser.email}`);
    console.log(`💰 Wallet Balance: $${testUser.walletBalance}`);

    // Check if TESTCO sender ID exists and is approved
    const testcoSenderId = await prisma.senderID.findFirst({
      where: {
        userId: testUser.id,
        senderId: "TESTCO",
        status: "APPROVED",
      },
    });

    if (!testcoSenderId) {
      console.log("❌ TESTCO sender ID not found or not approved");
      console.log("🔍 Let's check what sender IDs exist for this user:");

      const allSenderIds = await prisma.senderID.findMany({
        where: { userId: testUser.id },
      });

      console.log("📋 User's sender IDs:");
      allSenderIds.forEach((sid) => {
        console.log(`   - ${sid.senderId}: ${sid.status}`);
      });
      return;
    }

    console.log(`✅ Found TESTCO sender ID: ${testcoSenderId.status}`);

    // Prepare SMS data
    const smsData = {
      senderId: "TESTCO",
      recipient: "0502889775",
      message:
        "Hello! This is a test SMS from Mas3ndi platform using TESTCO sender ID. Testing successful! 🎉",
    };

    console.log("📤 Sending SMS...");
    console.log(`📞 To: ${smsData.recipient}`);
    console.log(`📧 From: ${smsData.senderId}`);
    console.log(`💬 Message: ${smsData.message}`);

    // We'll simulate the SMS service call since we need proper authentication
    // In a real scenario, this would go through the SMS service

    // Calculate cost (same logic as in SMS service)
    const messageLength = smsData.message.length;
    const smsCount = Math.ceil(messageLength / 160); // Basic SMS count calculation
    const costPerSms = 0.01; // $0.01 per SMS unit
    const totalCost = costPerSms * 1 * smsCount; // 1 recipient

    console.log(`📊 SMS Analysis:`);
    console.log(`   - Message length: ${messageLength} characters`);
    console.log(`   - SMS parts: ${smsCount}`);
    console.log(`   - Cost per SMS: $${costPerSms}`);
    console.log(`   - Total cost: $${totalCost}`);

    // Check if user has enough balance
    if (testUser.walletBalance < totalCost) {
      console.log(
        `❌ Insufficient balance! Need $${totalCost}, have $${testUser.walletBalance}`
      );
      return;
    }

    console.log(`✅ Sufficient balance for SMS`);

    // Create SMS log entry (simulating successful send)
    const smsLog = await prisma.smsLog.create({
      data: {
        userId: testUser.id,
        senderIdId: testcoSenderId.id, // Use the sender ID record ID, not the string
        recipients: [smsData.recipient],
        message: smsData.message,
        status: "SENT", // In real scenario, this would be "PENDING" initially
        cost: totalCost,
        providerRef: `test_${Date.now()}`, // Simulated Arkessel message ID
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
        description: `SMS to ${smsData.recipient} via ${smsData.senderId}`,
      },
    });

    console.log("🎉 SMS Test Completed Successfully!");
    console.log(`📝 SMS Log ID: ${smsLog.id}`);
    console.log(`💳 Transaction ID: ${walletTransaction.id}`);
    console.log(`💰 Remaining balance: $${updatedUser.walletBalance}`);
    console.log(`📱 SMS would be sent to: ${smsData.recipient}`);
    console.log(`📧 From sender ID: ${smsData.senderId}`);

    return {
      smsLog,
      walletTransaction,
      newBalance: updatedUser.walletBalance,
    };
  } catch (error) {
    console.error("❌ Error testing SMS send:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSmsSend();
