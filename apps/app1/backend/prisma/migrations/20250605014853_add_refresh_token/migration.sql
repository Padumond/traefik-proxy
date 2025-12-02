-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "SenderIdStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "apiKey" TEXT,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactToGroup" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "ContactToGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sender_ids" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "status" "SenderIdStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sender_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderIdId" TEXT,
    "message" TEXT NOT NULL,
    "recipients" TEXT[],
    "providerRef" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "cost" DOUBLE PRECISION NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleStatus" "ScheduleStatus",
    "jobId" TEXT,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_apis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "mappedTo" TEXT NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replacedBy" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContactToGroup_contactId_groupId_key" ON "ContactToGroup"("contactId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "sender_ids_userId_senderId_key" ON "sender_ids"("userId", "senderId");

-- CreateIndex
CREATE UNIQUE INDEX "client_apis_userId_route_key" ON "client_apis"("userId", "route");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactToGroup" ADD CONSTRAINT "ContactToGroup_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactToGroup" ADD CONSTRAINT "ContactToGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sender_ids" ADD CONSTRAINT "sender_ids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_senderIdId_fkey" FOREIGN KEY ("senderIdId") REFERENCES "sender_ids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_apis" ADD CONSTRAINT "client_apis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
