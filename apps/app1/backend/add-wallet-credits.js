const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addWalletCredits() {
  try {
    console.log("💰 Adding wallet credits to test user...");

    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });

    if (!testUser) {
      console.log("❌ Test user not found");
      return;
    }

    console.log(`📧 Found user: ${testUser.email}`);
    console.log(`💳 Current balance: $${testUser.walletBalance}`);

    // Add $10 credits
    const creditAmount = 10.0;
    
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        walletBalance: {
          increment: creditAmount,
        },
      },
    });

    // Create transaction record
    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: testUser.id,
        amount: creditAmount,
        type: "CREDIT",
        description: "Manual credit addition for testing",
      },
    });

    console.log(`✅ Added $${creditAmount} credits successfully!`);
    console.log(`💰 New balance: $${updatedUser.walletBalance}`);
    console.log(`📝 Transaction ID: ${transaction.id}`);
    
    return {
      user: updatedUser,
      transaction,
    };
  } catch (error) {
    console.error("❌ Error adding wallet credits:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addWalletCredits();
