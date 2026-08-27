/*
  Warnings:

  - You are about to drop the column `berat_kg` on the `civil_laporan_tps3r` table. All the data in the column will be lost.
  - You are about to drop the column `kategori` on the `civil_laporan_tps3r` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "civil_laporan_tps3r_kategori_idx";

-- AlterTable
ALTER TABLE "civil_laporan_tps3r" DROP COLUMN "berat_kg",
DROP COLUMN "kategori",
ADD COLUMN     "berat_non_organik" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "berat_organik" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "berat_recycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "berat_residu" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "berat_reuse" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "KategoriTps3r";
