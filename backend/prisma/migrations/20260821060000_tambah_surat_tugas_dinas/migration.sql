-- CreateEnum
CREATE TYPE "StatusSuratTugas" AS ENUM ('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "surat_tugas_dinas" (
    "id" SERIAL NOT NULL,
    "nomor" TEXT NOT NULL,
    "tujuan_lokasi" TEXT NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "keterangan_tugas" TEXT NOT NULL,
    "status" "StatusSuratTugas" NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
    "file_pdf" TEXT,
    "dibuat_oleh_id" INTEGER NOT NULL,
    "disetujui_oleh_id" INTEGER NOT NULL,
    "disetujui_pada" TIMESTAMP(3),
    "alasan_tolak" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_tugas_dinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_tugas_karyawan" (
    "id" SERIAL NOT NULL,
    "surat_tugas_id" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL,
    "nrp" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "departemen" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,

    CONSTRAINT "surat_tugas_karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surat_tugas_dinas_nomor_key" ON "surat_tugas_dinas"("nomor");

-- CreateIndex
CREATE INDEX "surat_tugas_dinas_status_idx" ON "surat_tugas_dinas"("status");

-- CreateIndex
CREATE INDEX "surat_tugas_dinas_dibuat_oleh_id_idx" ON "surat_tugas_dinas"("dibuat_oleh_id");

-- CreateIndex
CREATE INDEX "surat_tugas_dinas_disetujui_oleh_id_idx" ON "surat_tugas_dinas"("disetujui_oleh_id");

-- CreateIndex
CREATE INDEX "surat_tugas_karyawan_surat_tugas_id_idx" ON "surat_tugas_karyawan"("surat_tugas_id");

-- AddForeignKey
ALTER TABLE "surat_tugas_dinas" ADD CONSTRAINT "surat_tugas_dinas_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_tugas_dinas" ADD CONSTRAINT "surat_tugas_dinas_disetujui_oleh_id_fkey" FOREIGN KEY ("disetujui_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_tugas_karyawan" ADD CONSTRAINT "surat_tugas_karyawan_surat_tugas_id_fkey" FOREIGN KEY ("surat_tugas_id") REFERENCES "surat_tugas_dinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
