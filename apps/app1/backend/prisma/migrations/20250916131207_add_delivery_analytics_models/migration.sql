-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED', 'REJECTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING', 'DISABLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DELIVERY_SUMMARY', 'DETAILED_DELIVERY', 'ANALYTICS_REPORT', 'CUSTOM_REPORT');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'EXCEL', 'JSON');

-- CreateTable
CREATE TABLE "delivery_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smsLogId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "networkOperator" TEXT,
    "countryCode" TEXT,
    "cost" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_status_history" (
    "id" TEXT NOT NULL,
    "deliveryReportId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT,
    "retryAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 60,
    "headers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookConfigId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalPending" INTEGER NOT NULL DEFAULT 0,
    "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDeliveryTime" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countryCode" TEXT,
    "serviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "schedule" TEXT NOT NULL,
    "filters" JSONB,
    "recipients" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "scheduledReportId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "filePath" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "notificationChannels" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_reports_smsLogId_key" ON "delivery_reports"("smsLogId");

-- CreateIndex
CREATE INDEX "delivery_reports_userId_status_idx" ON "delivery_reports"("userId", "status");

-- CreateIndex
CREATE INDEX "delivery_reports_messageId_idx" ON "delivery_reports"("messageId");

-- CreateIndex
CREATE INDEX "delivery_reports_deliveredAt_idx" ON "delivery_reports"("deliveredAt");

-- CreateIndex
CREATE INDEX "delivery_status_history_deliveryReportId_timestamp_idx" ON "delivery_status_history"("deliveryReportId", "timestamp");

-- CreateIndex
CREATE INDEX "webhook_configs_userId_isActive_idx" ON "webhook_configs"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_configs_userId_name_key" ON "webhook_configs"("userId", "name");

-- CreateIndex
CREATE INDEX "webhook_logs_webhookConfigId_status_idx" ON "webhook_logs"("webhookConfigId", "status");

-- CreateIndex
CREATE INDEX "webhook_logs_eventType_idx" ON "webhook_logs"("eventType");

-- CreateIndex
CREATE INDEX "webhook_logs_nextRetryAt_idx" ON "webhook_logs"("nextRetryAt");

-- CreateIndex
CREATE INDEX "delivery_analytics_userId_date_idx" ON "delivery_analytics"("userId", "date");

-- CreateIndex
CREATE INDEX "delivery_analytics_countryCode_idx" ON "delivery_analytics"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_analytics_userId_date_countryCode_serviceType_key" ON "delivery_analytics"("userId", "date", "countryCode", "serviceType");

-- CreateIndex
CREATE INDEX "scheduled_reports_userId_isActive_idx" ON "scheduled_reports"("userId", "isActive");

-- CreateIndex
CREATE INDEX "scheduled_reports_nextRunAt_idx" ON "scheduled_reports"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_reports_userId_name_key" ON "scheduled_reports"("userId", "name");

-- CreateIndex
CREATE INDEX "report_runs_scheduledReportId_startedAt_idx" ON "report_runs"("scheduledReportId", "startedAt");

-- CreateIndex
CREATE INDEX "report_runs_status_idx" ON "report_runs"("status");

-- CreateIndex
CREATE INDEX "delivery_alerts_userId_isActive_idx" ON "delivery_alerts"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_alerts_userId_name_key" ON "delivery_alerts"("userId", "name");

-- AddForeignKey
ALTER TABLE "delivery_reports" ADD CONSTRAINT "delivery_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_reports" ADD CONSTRAINT "delivery_reports_smsLogId_fkey" FOREIGN KEY ("smsLogId") REFERENCES "sms_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_status_history" ADD CONSTRAINT "delivery_status_history_deliveryReportId_fkey" FOREIGN KEY ("deliveryReportId") REFERENCES "delivery_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhookConfigId_fkey" FOREIGN KEY ("webhookConfigId") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_analytics" ADD CONSTRAINT "delivery_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "scheduled_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_alerts" ADD CONSTRAINT "delivery_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
