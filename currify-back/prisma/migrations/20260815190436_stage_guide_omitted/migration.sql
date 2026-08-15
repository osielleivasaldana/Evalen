-- AlterEnum
ALTER TYPE "public"."StageStatus" ADD VALUE 'OMITTED';

-- AlterTable
ALTER TABLE "public"."stage_instances" ADD COLUMN     "guideJson" JSONB,
ADD COLUMN     "notesJson" JSONB;
