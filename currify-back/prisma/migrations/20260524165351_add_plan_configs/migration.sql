-- CreateTable
CREATE TABLE "public"."plan_configs" (
    "id" TEXT NOT NULL,
    "tier" "public"."PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "campaignLimit" INTEGER NOT NULL,
    "cvCredits" INTEGER NOT NULL,
    "smartFillCredits" INTEGER NOT NULL,
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_configs_tier_key" ON "public"."plan_configs"("tier");
