-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'OWNER';

-- CreateTable
CREATE TABLE "public"."llm_usage_logs" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "company" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usage_logs_pkey" PRIMARY KEY ("id")
);
