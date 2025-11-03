-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "conditions" TEXT,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."candidates" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "structuredData" JSONB,
    "processingStatus" "public"."ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "processingStatus" "public"."ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_publicId_key" ON "public"."campaigns"("publicId");

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."candidates" ADD CONSTRAINT "candidates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
