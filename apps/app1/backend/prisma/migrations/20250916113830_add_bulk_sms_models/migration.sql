/*
  Warnings:

  - A unique constraint covering the columns `[userId,phone]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PAUSED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "tags" TEXT[];

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "contactGroupId" TEXT,
    "senderId" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_userId_name_key" ON "sms_templates"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_phone_key" ON "Contact"("userId", "phone");

-- AddForeignKey
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "sms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_contactGroupId_fkey" FOREIGN KEY ("contactGroupId") REFERENCES "ContactGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
