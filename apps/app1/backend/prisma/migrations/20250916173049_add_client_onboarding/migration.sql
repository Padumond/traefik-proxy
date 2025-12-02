-- CreateTable
CREATE TABLE "client_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "businessType" TEXT NOT NULL,
    "expectedVolume" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "onboardingStatus" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_userId_key" ON "client_profiles"("userId");

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
