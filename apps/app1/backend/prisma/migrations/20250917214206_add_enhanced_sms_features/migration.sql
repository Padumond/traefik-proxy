/*
  Warnings:

  - You are about to drop the `MessageTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'RECURRING');

-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'PROCESSING';

-- DropForeignKey
ALTER TABLE "MessageTemplate" DROP CONSTRAINT "MessageTemplate_userId_fkey";

-- AlterTable
ALTER TABLE "sms_logs" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "templateId" TEXT;

-- DropTable
DROP TABLE "MessageTemplate";

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT,
    "message" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipients" TEXT[],
    "contactGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "variables" JSONB,
    "campaignType" "CampaignType" NOT NULL DEFAULT 'IMMEDIATE',
    "recurringConfig" JSONB,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'SCHEDULED',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "messagesDelivered" INTEGER NOT NULL DEFAULT 0,
    "messagesFailed" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "deliveredMessages" INTEGER NOT NULL DEFAULT 0,
    "failedMessages" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_userId_name_key" ON "message_templates"("userId", "name");

-- CreateIndex
CREATE INDEX "sms_campaigns_userId_idx" ON "sms_campaigns"("userId");

-- CreateIndex
CREATE INDEX "sms_campaigns_status_idx" ON "sms_campaigns"("status");

-- CreateIndex
CREATE INDEX "sms_campaigns_scheduledAt_idx" ON "sms_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "user_stats_userId_idx" ON "user_stats"("userId");

-- CreateIndex
CREATE INDEX "user_stats_date_idx" ON "user_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_userId_date_key" ON "user_stats"("userId", "date");

-- CreateIndex
CREATE INDEX "daily_reports_userId_idx" ON "daily_reports"("userId");

-- CreateIndex
CREATE INDEX "daily_reports_date_idx" ON "daily_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_userId_date_key" ON "daily_reports"("userId", "date");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "sms_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_campaigns" ADD CONSTRAINT "sms_campaigns_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
