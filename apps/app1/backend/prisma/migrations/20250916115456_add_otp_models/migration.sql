-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('PHONE_VERIFICATION', 'LOGIN_VERIFICATION', 'PASSWORD_RESET', 'TRANSACTION_VERIFICATION', 'CUSTOM');

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OtpType" NOT NULL DEFAULT 'PHONE_VERIFICATION',
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verification_attempts" (
    "id" TEXT NOT NULL,
    "otpId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_rate_limits" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "userId" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OtpType" NOT NULL,
    "message" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "expiryMinutes" INTEGER NOT NULL DEFAULT 5,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_phoneNumber_status_idx" ON "otps"("phoneNumber", "status");

-- CreateIndex
CREATE INDEX "otps_userId_type_idx" ON "otps"("userId", "type");

-- CreateIndex
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_rate_limits_identifier_identifierType_idx" ON "otp_rate_limits"("identifier", "identifierType");

-- CreateIndex
CREATE INDEX "otp_rate_limits_windowStart_idx" ON "otp_rate_limits"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "otp_rate_limits_identifier_identifierType_key" ON "otp_rate_limits"("identifier", "identifierType");

-- CreateIndex
CREATE INDEX "otp_templates_userId_type_idx" ON "otp_templates"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "otp_templates_userId_name_key" ON "otp_templates"("userId", "name");

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_verification_attempts" ADD CONSTRAINT "otp_verification_attempts_otpId_fkey" FOREIGN KEY ("otpId") REFERENCES "otps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_rate_limits" ADD CONSTRAINT "otp_rate_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_templates" ADD CONSTRAINT "otp_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
