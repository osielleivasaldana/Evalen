-- CreateEnum
CREATE TYPE "public"."WorkType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "public"."Modality" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE');

-- CreateEnum
CREATE TYPE "public"."Duration" AS ENUM ('INDEFINITE', 'FIXED_TERM', 'PROJECT');

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('CLP', 'USD', 'EUR', 'UF');

-- AlterTable
ALTER TABLE "public"."campaigns" ADD COLUMN     "currency" "public"."Currency" NOT NULL DEFAULT 'CLP',
ADD COLUMN     "duration" "public"."Duration",
ADD COLUMN     "inclusionPosition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "modality" "public"."Modality",
ADD COLUMN     "salary" DECIMAL(65,30),
ADD COLUMN     "showSalary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workType" "public"."WorkType";
