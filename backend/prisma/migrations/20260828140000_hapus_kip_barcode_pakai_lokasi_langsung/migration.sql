-- AlterTable: tambah kolom lokasi (nullable dulu untuk backfill)
ALTER TABLE "civil_kip" ADD COLUMN "lokasi" "LokasiHousekeepingIndoor";

-- Backfill dari tabel barcode lama
UPDATE "civil_kip" k
SET "lokasi" = b."lokasi"
FROM "civil_kip_barcode" b
WHERE k."barcode_id" = b."id";

-- Wajibkan NOT NULL setelah backfill
ALTER TABLE "civil_kip" ALTER COLUMN "lokasi" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "civil_kip" DROP CONSTRAINT "civil_kip_barcode_id_fkey";

-- DropIndex
DROP INDEX "civil_kip_barcode_id_idx";

-- AlterTable: hapus kolom barcode_id
ALTER TABLE "civil_kip" DROP COLUMN "barcode_id";

-- DropTable
DROP TABLE "civil_kip_barcode";

-- CreateIndex
CREATE INDEX "civil_kip_lokasi_idx" ON "civil_kip"("lokasi");
