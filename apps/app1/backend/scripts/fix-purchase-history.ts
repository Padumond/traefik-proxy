import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixPurchaseHistory() {
  try {
    console.log("Starting purchase history fix...");

    // Get all purchase records - we'll check for missing data in the loop
    const allPurchases = await prisma.packagePurchase.findMany({
      include: {
        package: true,
      },
    });

    // Filter purchases with missing payment data
    const purchasesWithMissingData = allPurchases.filter(
      (purchase) =>
        !purchase.amountPaid ||
        purchase.amountPaid === 0 ||
        !purchase.paymentMethod ||
        purchase.paymentMethod === ""
    );

    console.log(
      `Found ${purchasesWithMissingData.length} purchases with missing payment data`
    );

    // Log all purchases to see what data we have
    console.log("\nAll purchases in database:");
    allPurchases.forEach((purchase, index) => {
      console.log(`Purchase ${index + 1}:`, {
        id: purchase.id,
        creditsReceived: purchase.creditsReceived,
        amountPaid: purchase.amountPaid,
        paymentMethod: purchase.paymentMethod,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        paymentReference: purchase.paymentReference,
      });
    });

    for (const purchase of purchasesWithMissingData) {
      // Calculate amount based on credits received (using current rate of GH₵0.059 per SMS)
      const estimatedAmount = purchase.creditsReceived * 0.059;

      // Update the purchase record
      await prisma.packagePurchase.update({
        where: { id: purchase.id },
        data: {
          amountPaid: estimatedAmount,
          paymentMethod: "paystack", // Default to paystack since that's what we're using
          currency: "GHS",
          // Keep the original createdAt if it exists, otherwise it will remain as is
        },
      });

      console.log(
        `Updated purchase ${purchase.id}: ${
          purchase.creditsReceived
        } credits = GH₵${estimatedAmount.toFixed(2)}`
      );
    }

    console.log("Purchase history fix completed successfully!");
  } catch (error) {
    console.error("Error fixing purchase history:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixPurchaseHistory();
