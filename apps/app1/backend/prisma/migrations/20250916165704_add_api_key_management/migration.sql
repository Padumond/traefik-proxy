-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "suffix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_usage_logs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "requestId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_key_usage_logs_apiKeyId_idx" ON "api_key_usage_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "api_key_usage_logs_timestamp_idx" ON "api_key_usage_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
