-- AlterTable
ALTER TABLE "sender_ids" ADD COLUMN     "companyName" TEXT;

-- DropEnum
DROP TYPE "SyncStatus";

-- CreateTable
CREATE TABLE "sms_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "creditsReceived" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_packages_name_key" ON "sms_packages"("name");

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_purchases" ADD CONSTRAINT "package_purchases_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "sms_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
