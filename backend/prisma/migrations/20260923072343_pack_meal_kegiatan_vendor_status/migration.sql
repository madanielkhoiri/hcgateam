-- Field "No. Kontak" diganti jadi "Kegiatan" sesuai kebutuhan resi - pakai
-- RENAME (bukan drop+add) supaya data yang sudah ada tidak hilang.
-- CreateEnum
CREATE TYPE "StatusApprovalPackMeal" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusDeliveryPackMeal" AS ENUM ('DIPROSES', 'SELESAI', 'DIBATALKAN');

-- AlterTable
ALTER TABLE "pack_meal_orders" RENAME COLUMN "contact_number" TO "kegiatan";
ALTER TABLE "pack_meal_orders"
ADD COLUMN     "status_approval" "StatusApprovalPackMeal" NOT NULL DEFAULT 'MENUNGGU',
ADD COLUMN     "status_delivery" "StatusDeliveryPackMeal" NOT NULL DEFAULT 'DIPROSES',
ADD COLUMN     "vendor" TEXT;
