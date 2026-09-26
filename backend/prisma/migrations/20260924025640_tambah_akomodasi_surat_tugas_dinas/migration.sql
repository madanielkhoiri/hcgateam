-- AlterTable
ALTER TABLE "surat_tugas_dinas" ADD COLUMN     "akomodasi_keterangan" TEXT,
ADD COLUMN     "akomodasi_nominal" INTEGER,
ADD COLUMN     "bantuan_transportasi" TEXT,
ADD COLUMN     "jumlah_akomodasi" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "laundry_keterangan" TEXT,
ADD COLUMN     "laundry_nominal" INTEGER,
ADD COLUMN     "penginapan_hotel" TEXT,
ADD COLUMN     "uang_perjalanan_keterangan" TEXT,
ADD COLUMN     "uang_perjalanan_nominal" INTEGER;
