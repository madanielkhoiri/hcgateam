/*
  Warnings:

  - A unique constraint covering the columns `[nrp]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'FA';
ALTER TYPE "UserRole" ADD VALUE 'KARYAWAN';
ALTER TYPE "UserRole" ADD VALUE 'VENDOR';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kode_tiket" TEXT,
ADD COLUMN     "nrp" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "signature_image" TEXT,
ADD COLUMN     "two_factor_secret" TEXT,
ADD COLUMN     "vendor_id" INTEGER,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'KARYAWAN';

-- CreateIndex
CREATE UNIQUE INDEX "users_nrp_key" ON "users"("nrp");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
