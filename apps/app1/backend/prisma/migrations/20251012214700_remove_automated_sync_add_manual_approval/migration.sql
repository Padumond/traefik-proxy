-- Remove Arkessel sync fields and add manual approval fields
-- AlterTable
ALTER TABLE "sender_ids" DROP COLUMN "arkeselData",
DROP COLUMN "arkeselSenderIdId",
DROP COLUMN "arkeselStatus",
DROP COLUMN "lastSyncAt",
DROP COLUMN "lastSyncError",
DROP COLUMN "syncRetryCount",
DROP COLUMN "syncStatus",
ADD COLUMN "adminNotes" TEXT,
ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "consentFormMimeType" TEXT,
ADD COLUMN "consentFormOriginalName" TEXT,
ADD COLUMN "consentFormPath" TEXT,
ADD COLUMN "consentFormSize" INTEGER,
ADD COLUMN "emailNotificationSent" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "sender_ids" ADD CONSTRAINT "sender_ids_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
