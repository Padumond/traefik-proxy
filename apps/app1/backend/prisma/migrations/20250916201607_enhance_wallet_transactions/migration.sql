/*
  Warnings:

  - Added the required column `updatedAt` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "externalTransactionId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
