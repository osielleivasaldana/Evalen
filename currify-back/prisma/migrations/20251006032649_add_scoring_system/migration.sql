-- AlterTable
ALTER TABLE "public"."campaigns" ADD COLUMN     "parsedJobData" JSONB,
ADD COLUMN     "parsedJobDataAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."candidate_scorings" (
    "id" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "breakdown" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "gaps" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,

    CONSTRAINT "candidate_scorings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_scorings_candidateId_key" ON "public"."candidate_scorings"("candidateId");

-- AddForeignKey
ALTER TABLE "public"."candidate_scorings" ADD CONSTRAINT "candidate_scorings_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
