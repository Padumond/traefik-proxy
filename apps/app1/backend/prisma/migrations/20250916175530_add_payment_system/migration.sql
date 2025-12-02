-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "description" TEXT,
    "stripeChargeId" TEXT,
    "paypalOrderId" TEXT,
    "refundId" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundReason" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentIntentId_key" ON "payments"("paymentIntentId");

-- CreateIndex
CREATE INDEX "payments_userId_status_idx" ON "payments"("userId", "status");

-- CreateIndex
CREATE INDEX "payments_paymentIntentId_idx" ON "payments"("paymentIntentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
