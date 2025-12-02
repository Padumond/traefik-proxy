-- AlterTable
ALTER TABLE "sender_ids" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "sampleMessage" TEXT;
