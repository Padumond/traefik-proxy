-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'RETRYING');

-- AlterTable
ALTER TABLE "sender_ids" ADD COLUMN     "arkeselData" JSONB,
ADD COLUMN     "arkeselSenderIdId" TEXT,
ADD COLUMN     "arkeselStatus" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "syncRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING';
