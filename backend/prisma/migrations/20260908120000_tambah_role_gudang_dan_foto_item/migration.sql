-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'GUDANG';

-- AlterTable
ALTER TABLE "items" ADD COLUMN "photo_path" TEXT;
