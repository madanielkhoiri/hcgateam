-- CreateEnum
CREATE TYPE "StatusAnakMagang" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateTable
CREATE TABLE "anak_magang" (
    "id" SERIAL NOT NULL,
    "nrp" TEXT,
    "nama" TEXT NOT NULL,
    "nim" TEXT,
    "jurusan" TEXT,
    "asal_kampus" TEXT,
    "ukuran_celana" TEXT,
    "ukuran_sepatu" TEXT,
    "no_kk" TEXT,
    "rekomendasi" TEXT,
    "atasan_langsung" TEXT,
    "status" "StatusAnakMagang" NOT NULL DEFAULT 'AKTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anak_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_balasan_magang" (
    "id" SERIAL NOT NULL,
    "nomor" TEXT NOT NULL,
    "nomor_urut" INTEGER NOT NULL,
    "tahun_terbit" INTEGER NOT NULL,
    "nomor_surat_masuk" TEXT,
    "perihal_surat_masuk" TEXT,
    "tujuan_jurusan" TEXT NOT NULL,
    "kota_tujuan" TEXT NOT NULL,
    "file_pdf" TEXT,
    "dibuat_oleh_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_balasan_magang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_balasan_magang_baris" (
    "id" SERIAL NOT NULL,
    "surat_id" INTEGER NOT NULL,
    "anak_magang_id" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "jurusan" TEXT NOT NULL,
    "departemen_tujuan" TEXT NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,

    CONSTRAINT "surat_balasan_magang_baris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_penolakan_magang" (
    "id" SERIAL NOT NULL,
    "nomor" TEXT NOT NULL,
    "nomor_urut" INTEGER NOT NULL,
    "tahun_terbit" INTEGER NOT NULL,
    "anak_magang_id" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "sapaan" TEXT NOT NULL,
    "alasan_penolakan" TEXT NOT NULL,
    "file_pdf" TEXT,
    "dibuat_oleh_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surat_penolakan_magang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anak_magang_status_idx" ON "anak_magang"("status");

-- CreateIndex
CREATE UNIQUE INDEX "surat_balasan_magang_nomor_key" ON "surat_balasan_magang"("nomor");

-- CreateIndex
CREATE INDEX "surat_balasan_magang_tahun_terbit_idx" ON "surat_balasan_magang"("tahun_terbit");

-- CreateIndex
CREATE INDEX "surat_balasan_magang_baris_surat_id_idx" ON "surat_balasan_magang_baris"("surat_id");

-- CreateIndex
CREATE UNIQUE INDEX "surat_penolakan_magang_nomor_key" ON "surat_penolakan_magang"("nomor");

-- CreateIndex
CREATE INDEX "surat_penolakan_magang_tahun_terbit_idx" ON "surat_penolakan_magang"("tahun_terbit");

-- AddForeignKey
ALTER TABLE "surat_balasan_magang" ADD CONSTRAINT "surat_balasan_magang_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_balasan_magang_baris" ADD CONSTRAINT "surat_balasan_magang_baris_surat_id_fkey" FOREIGN KEY ("surat_id") REFERENCES "surat_balasan_magang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_balasan_magang_baris" ADD CONSTRAINT "surat_balasan_magang_baris_anak_magang_id_fkey" FOREIGN KEY ("anak_magang_id") REFERENCES "anak_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_penolakan_magang" ADD CONSTRAINT "surat_penolakan_magang_anak_magang_id_fkey" FOREIGN KEY ("anak_magang_id") REFERENCES "anak_magang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_penolakan_magang" ADD CONSTRAINT "surat_penolakan_magang_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
