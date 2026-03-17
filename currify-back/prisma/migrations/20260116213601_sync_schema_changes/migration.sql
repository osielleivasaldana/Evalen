/*
  Warnings:

  - A unique constraint covering the columns `[activationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."PlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."StripeStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'TRIALING');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "activationExpiry" TIMESTAMP(3),
ADD COLUMN     "activationToken" TEXT,
ADD COLUMN     "atsSystem" TEXT,
ADD COLUMN     "campaignLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "companySize" TEXT,
ADD COLUMN     "cvCredits" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "hiringVolume" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan" "public"."PlanTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "socialId" TEXT,
ADD COLUMN     "socialProvider" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeStatus" "public"."StripeStatus",
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_activationToken_key" ON "public"."users"("activationToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "public"."users"("stripeCustomerId");
