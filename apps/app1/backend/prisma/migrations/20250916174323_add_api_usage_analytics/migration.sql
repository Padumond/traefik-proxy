-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_usage_logs_userId_timestamp_idx" ON "api_usage_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "api_usage_logs_apiKeyId_timestamp_idx" ON "api_usage_logs"("apiKeyId", "timestamp");

-- CreateIndex
CREATE INDEX "api_usage_logs_endpoint_timestamp_idx" ON "api_usage_logs"("endpoint", "timestamp");

-- CreateIndex
CREATE INDEX "api_usage_logs_timestamp_idx" ON "api_usage_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
