-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "notifyChannel" TEXT NOT NULL DEFAULT 'whatsapp',
    "notifyDueToday" BOOLEAN NOT NULL DEFAULT true,
    "notifyOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailySummary" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnComplete" BOOLEAN NOT NULL DEFAULT true,
    "dailySummaryHour" INTEGER NOT NULL DEFAULT 8,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
