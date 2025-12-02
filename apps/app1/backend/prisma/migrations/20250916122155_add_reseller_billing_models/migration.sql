-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'TIERED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('PREPAID', 'POSTPAID_WEEKLY', 'POSTPAID_MONTHLY', 'POSTPAID_QUARTERLY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "pricing_tier_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "PricingTier" NOT NULL,
    "basePricePerSms" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "minVolume" INTEGER NOT NULL DEFAULT 0,
    "maxVolume" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pricing_tiers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pricingTierId" TEXT NOT NULL,
    "customPricing" JSONB,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markup_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "markupType" "MarkupType" NOT NULL,
    "markupValue" DOUBLE PRECISION NOT NULL,
    "minVolume" INTEGER NOT NULL DEFAULT 0,
    "maxVolume" INTEGER,
    "countryCode" TEXT,
    "smsType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markup_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "baseCost" DOUBLE PRECISION NOT NULL,
    "clientCharge" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "markupApplied" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'PREPAID',
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRecharge" BOOLEAN NOT NULL DEFAULT false,
    "autoRechargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRechargeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billingConfigId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tier_configs_name_key" ON "pricing_tier_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_pricing_tiers_userId_pricingTierId_key" ON "user_pricing_tiers"("userId", "pricingTierId");

-- CreateIndex
CREATE INDEX "markup_rules_userId_isActive_idx" ON "markup_rules"("userId", "isActive");

-- CreateIndex
CREATE INDEX "markup_rules_priority_idx" ON "markup_rules"("priority");

-- CreateIndex
CREATE INDEX "profit_transactions_userId_createdAt_idx" ON "profit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "profit_transactions_transactionType_idx" ON "profit_transactions"("transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "billing_configs_userId_key" ON "billing_configs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_userId_status_idx" ON "invoices"("userId", "status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_createdAt_idx" ON "credit_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- AddForeignKey
ALTER TABLE "user_pricing_tiers" ADD CONSTRAINT "user_pricing_tiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pricing_tiers" ADD CONSTRAINT "user_pricing_tiers_pricingTierId_fkey" FOREIGN KEY ("pricingTierId") REFERENCES "pricing_tier_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markup_rules" ADD CONSTRAINT "markup_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_transactions" ADD CONSTRAINT "profit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_configs" ADD CONSTRAINT "billing_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billingConfigId_fkey" FOREIGN KEY ("billingConfigId") REFERENCES "billing_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
