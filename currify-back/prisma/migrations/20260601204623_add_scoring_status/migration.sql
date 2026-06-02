-- CreateEnum
CREATE TYPE "public"."ScoringStatus" AS ENUM ('CURRENT', 'OUTDATED', 'PENDING');

-- AlterTable
ALTER TABLE "public"."candidates" ADD COLUMN     "scoringStatus" "public"."ScoringStatus" NOT NULL DEFAULT 'CURRENT';
