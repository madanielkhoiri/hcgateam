-- AlterTable
ALTER TABLE "eprom_vendors" ADD COLUMN     "email" TEXT,
ADD COLUMN     "no_telepon" TEXT,
ADD COLUMN     "status_aktif" BOOLEAN NOT NULL DEFAULT true;
