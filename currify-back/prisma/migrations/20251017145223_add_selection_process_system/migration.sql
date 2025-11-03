-- CreateEnum
CREATE TYPE "public"."CandidateStatus" AS ENUM ('NEW', 'IN_PROCESS', 'NOT_SELECTED', 'SELECTED');

-- CreateEnum
CREATE TYPE "public"."StageStatus" AS ENUM ('PENDING', 'ACTIVE', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'RECRUITER', 'TECHNICAL_REVIEWER');

-- AlterTable
ALTER TABLE "public"."candidates" ADD COLUMN     "candidateStatus" "public"."CandidateStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "stageInstanceId" TEXT,
ALTER COLUMN "candidateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'RECRUITER';

-- CreateTable
CREATE TABLE "public"."stage_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "stage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_instances" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "currentStageOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,

    CONSTRAINT "process_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stage_instances" (
    "id" TEXT NOT NULL,
    "status" "public"."StageStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processInstanceId" TEXT NOT NULL,
    "stageTemplateId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "stage_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "processInstanceId" TEXT,
    "stageInstanceId" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stage_templates_campaignId_order_idx" ON "public"."stage_templates"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "process_instances_campaignId_candidateId_key" ON "public"."process_instances"("campaignId", "candidateId");

-- CreateIndex
CREATE INDEX "stage_instances_processInstanceId_stageTemplateId_idx" ON "public"."stage_instances"("processInstanceId", "stageTemplateId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "public"."audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "public"."notifications"("userId", "read");

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_stageInstanceId_fkey" FOREIGN KEY ("stageInstanceId") REFERENCES "public"."stage_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_templates" ADD CONSTRAINT "stage_templates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_templates" ADD CONSTRAINT "stage_templates_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_instances" ADD CONSTRAINT "process_instances_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_instances" ADD CONSTRAINT "process_instances_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_instances" ADD CONSTRAINT "stage_instances_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "public"."process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_instances" ADD CONSTRAINT "stage_instances_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "public"."stage_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stage_instances" ADD CONSTRAINT "stage_instances_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "public"."process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_stageInstanceId_fkey" FOREIGN KEY ("stageInstanceId") REFERENCES "public"."stage_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
