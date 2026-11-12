-- CreateEnum
CREATE TYPE "MessCleaningStatus" AS ENUM ('DIBERSIHKAN', 'TIDAK_DIBERSIHKAN');

-- AlterTable
ALTER TABLE "mess_cleaning_sessions" ADD COLUMN "status" "MessCleaningStatus" NOT NULL DEFAULT 'DIBERSIHKAN',
ADD COLUMN "alasan" TEXT;
