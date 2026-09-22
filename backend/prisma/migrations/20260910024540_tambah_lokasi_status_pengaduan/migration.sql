-- CreateEnum
CREATE TYPE "LokasiPengaduan" AS ENUM ('TAMBANG', 'MESS');

-- CreateEnum
CREATE TYPE "StatusPengaduan" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITAHAN', 'DITOLAK');

-- AlterTable (lokasi ditambah nullable dulu supaya baris lama tidak gagal,
-- lalu di-backfill dan dikunci NOT NULL — data baru wajib isi lewat aplikasi)
ALTER TABLE "pengaduan_layanan" ADD COLUMN     "catatan_admin" TEXT,
ADD COLUMN     "diproses_oleh_id" INTEGER,
ADD COLUMN     "diproses_pada" TIMESTAMP(3),
ADD COLUMN     "lokasi" "LokasiPengaduan",
ADD COLUMN     "status" "StatusPengaduan" NOT NULL DEFAULT 'MENUNGGU';

UPDATE "pengaduan_layanan" SET "lokasi" = 'MESS' WHERE "lokasi" IS NULL;

ALTER TABLE "pengaduan_layanan" ALTER COLUMN "lokasi" SET NOT NULL;

-- CreateIndex
CREATE INDEX "pengaduan_layanan_status_idx" ON "pengaduan_layanan"("status");

-- AddForeignKey
ALTER TABLE "pengaduan_layanan" ADD CONSTRAINT "pengaduan_layanan_diproses_oleh_id_fkey" FOREIGN KEY ("diproses_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
