-- ==================================================
-- MCU PERIODIK
-- Referensi alur: alur-workflow-mcu-periodik-v3.md
-- ==================================================

-- CreateEnum
CREATE TYPE "PeranMcu" AS ENUM ('KARYAWAN', 'ADMIN_DEPT', 'HC', 'DOKTER', 'SHE', 'KLINIK');

-- CreateEnum
CREATE TYPE "StatusKerja" AS ENUM ('AKTIF', 'DIRUMAHKAN', 'RESIGN');

-- CreateEnum
CREATE TYPE "StatusKesehatanDirumahkan" AS ENUM ('SAKIT', 'FIT_SAKIT');

-- CreateEnum
CREATE TYPE "JenisMcu" AS ENUM ('AWAL', 'BERKALA', 'KHUSUS');

-- CreateEnum
CREATE TYPE "StatusPendaftaran" AS ENUM ('DRAFT', 'TERKUNCI', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusSuratPengantar" AS ENUM ('DRAFT', 'TERKIRIM');

-- CreateEnum
CREATE TYPE "StatusReview" AS ENUM ('MENUNGGU', 'DIREVIEW', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusRekomendasi" AS ENUM ('FIT', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PosBiayaFollowUp" AS ENUM ('MANDIRI');

-- CreateEnum
CREATE TYPE "StatusFollowUp" AS ENUM ('MENUNGGU_TANGGAL', 'TERJADWAL', 'TERLAKSANA', 'TERLAMBAT_RESCHEDULE', 'SELESAI');

-- CreateEnum
CREATE TYPE "TipePengunggah" AS ENUM ('KARYAWAN', 'KLINIK_TERKONEKSI', 'HC', 'ADMIN_DEPT');

-- CreateEnum
CREATE TYPE "StatusInduksiUlang" AS ENUM ('MENUNGGU', 'TERJADWAL', 'SELESAI');

-- CreateEnum
CREATE TYPE "TipeNotifikasiMcu" AS ENUM ('REMINDER_H3_BULAN', 'JADWAL_MCU', 'REKOMENDASI_FIT_FU', 'PILIHAN_TANGGAL_FU', 'REMINDER_FU_ULANG', 'HASIL_FU', 'INDUKSI_ULANG');

-- CreateEnum
CREATE TYPE "KanalNotifikasi" AS ENUM ('EMAIL_OUTLOOK', 'IN_APP');

-- CreateEnum
CREATE TYPE "StatusKirimNotifikasi" AS ENUM ('MENUNGGU', 'TERKIRIM', 'GAGAL');

-- CreateTable
CREATE TABLE "peran_akun_mcu" (
    "id" SERIAL NOT NULL,
    "akun_id" INTEGER NOT NULL,
    "peran" "PeranMcu" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peran_akun_mcu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departemen" (
    "id" SERIAL NOT NULL,
    "nama_departemen" TEXT NOT NULL,
    "admin_akun_id" INTEGER,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departemen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karyawan" (
    "id" SERIAL NOT NULL,
    "nik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "departemen_id" INTEGER NOT NULL,
    "jabatan" TEXT,
    "email" TEXT,
    "tanggal_lahir" DATE,
    "tanggal_mcu_terakhir" DATE,
    "tanggal_mcu_expired" DATE,
    "tanggal_mcu_berikutnya" DATE,
    "status_kerja" "StatusKerja" NOT NULL DEFAULT 'AKTIF',
    "status_kesehatan_dirumahkan" "StatusKesehatanDirumahkan",
    "akun_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "karyawan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klinik" (
    "id" SERIAL NOT NULL,
    "nama_klinik" TEXT NOT NULL,
    "alamat" TEXT,
    "pic_klinik" TEXT,
    "terkoneksi" BOOLEAN NOT NULL DEFAULT false,
    "akun_id" INTEGER,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klinik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_mcu" (
    "id" SERIAL NOT NULL,
    "karyawan_id" INTEGER NOT NULL,
    "departemen_id" INTEGER NOT NULL,
    "tanggal_mcu" DATE NOT NULL,
    "jenis_mcu" "JenisMcu" NOT NULL DEFAULT 'BERKALA',
    "klinik_id" INTEGER,
    "status_pendaftaran" "StatusPendaftaran" NOT NULL DEFAULT 'DRAFT',
    "tanggal_lock" DATE NOT NULL,
    "catatan" TEXT,
    "diubah_oleh_hc_id" INTEGER,
    "diubah_oleh_hc_at" TIMESTAMP(3),
    "alasan_perubahan_hc" TEXT,
    "dibatalkan_at" TIMESTAMP(3),
    "dibuat_oleh_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_mcu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_pengantar" (
    "id" SERIAL NOT NULL,
    "jadwal_mcu_id" INTEGER NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "nomor_urut" INTEGER NOT NULL,
    "tahun_terbit" INTEGER NOT NULL,
    "klinik_id" INTEGER,
    "tanggal_terbit" DATE NOT NULL,
    "file_pdf" TEXT,
    "status" "StatusSuratPengantar" NOT NULL DEFAULT 'DRAFT',
    "tanggal_kirim" TIMESTAMP(3),
    "diterbitkan_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_pengantar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_mcu" (
    "id" SERIAL NOT NULL,
    "jadwal_mcu_id" INTEGER NOT NULL,
    "tanggal_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diunggah_oleh_id" INTEGER NOT NULL,
    "tipe_pengunggah" "TipePengunggah" NOT NULL,
    "file_hasil_mcu" TEXT NOT NULL,
    "nama_file_asli" TEXT,
    "status_review" "StatusReview" NOT NULL DEFAULT 'MENUNGGU',
    "retensi_hapus_at" DATE NOT NULL,
    "file_dihapus_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hasil_mcu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rekomendasi_mcu" (
    "id" SERIAL NOT NULL,
    "hasil_mcu_id" INTEGER NOT NULL,
    "hasil_follow_up_asal_id" INTEGER,
    "dokter_id" INTEGER NOT NULL,
    "status" "StatusRekomendasi" NOT NULL,
    "catatan_medis_terbatas" TEXT,
    "file_pdf_rekomendasi" TEXT,
    "surat_rujukan_fu" TEXT,
    "nomor_surat_rujukan" TEXT,
    "siklus_ke" INTEGER NOT NULL DEFAULT 1,
    "tanggal_submit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diteruskan_ke_dept_at" TIMESTAMP(3),
    "diteruskan_ke_karyawan_at" TIMESTAMP(3),
    "diteruskan_oleh_id" INTEGER,
    "retensi_hapus_at" DATE NOT NULL,
    "file_dihapus_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rekomendasi_mcu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up" (
    "id" SERIAL NOT NULL,
    "rekomendasi_id" INTEGER NOT NULL,
    "karyawan_id" INTEGER NOT NULL,
    "pos_biaya" "PosBiayaFollowUp" NOT NULL DEFAULT 'MANDIRI',
    "batas_waktu_fu" DATE,
    "ditetapkan_oleh_hc_id" INTEGER,
    "ditetapkan_at" TIMESTAMP(3),
    "tanggal_pilihan_karyawan" DATE,
    "klinik_id" INTEGER,
    "status" "StatusFollowUp" NOT NULL DEFAULT 'MENUNGGU_TANGGAL',
    "jumlah_reminder_hc" INTEGER NOT NULL DEFAULT 0,
    "reminder_terakhir_at" TIMESTAMP(3),
    "siklus_ke" INTEGER NOT NULL DEFAULT 1,
    "ditutup_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_follow_up" (
    "id" SERIAL NOT NULL,
    "follow_up_id" INTEGER NOT NULL,
    "tanggal_submit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diunggah_oleh_id" INTEGER NOT NULL,
    "tipe_pengunggah" "TipePengunggah" NOT NULL,
    "file_hasil_fu" TEXT NOT NULL,
    "nama_file_asli" TEXT,
    "status_review" "StatusReview" NOT NULL DEFAULT 'MENUNGGU',
    "retensi_hapus_at" DATE NOT NULL,
    "file_dihapus_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hasil_follow_up_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "induksi_ulang" (
    "id" SERIAL NOT NULL,
    "karyawan_id" INTEGER NOT NULL,
    "rekomendasi_pemicu_id" INTEGER NOT NULL,
    "departemen_id" INTEGER NOT NULL,
    "tanggal_daftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_pelaksanaan" DATE,
    "status" "StatusInduksiUlang" NOT NULL DEFAULT 'MENUNGGU',
    "she_id" INTEGER,
    "catatan" TEXT,
    "selesai_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "induksi_ulang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_notifikasi_mcu" (
    "id" SERIAL NOT NULL,
    "tipe" "TipeNotifikasiMcu" NOT NULL,
    "ref_tabel" TEXT NOT NULL,
    "ref_id" INTEGER NOT NULL,
    "penerima_id" INTEGER,
    "penerima_email" TEXT,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "kanal" "KanalNotifikasi" NOT NULL DEFAULT 'IN_APP',
    "status_kirim" "StatusKirimNotifikasi" NOT NULL DEFAULT 'MENUNGGU',
    "waktu_kirim" TIMESTAMP(3),
    "dibaca_at" TIMESTAMP(3),
    "keterangan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_notifikasi_mcu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peran_akun_mcu_akun_id_peran_key" ON "peran_akun_mcu"("akun_id", "peran");

-- CreateIndex
CREATE INDEX "peran_akun_mcu_peran_idx" ON "peran_akun_mcu"("peran");

-- CreateIndex
CREATE UNIQUE INDEX "departemen_nama_departemen_key" ON "departemen"("nama_departemen");

-- CreateIndex
CREATE INDEX "departemen_admin_akun_id_idx" ON "departemen"("admin_akun_id");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_nik_key" ON "karyawan"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_akun_id_key" ON "karyawan"("akun_id");

-- CreateIndex
CREATE INDEX "karyawan_departemen_id_idx" ON "karyawan"("departemen_id");

-- CreateIndex
CREATE INDEX "karyawan_status_kerja_idx" ON "karyawan"("status_kerja");

-- CreateIndex
CREATE INDEX "karyawan_tanggal_mcu_berikutnya_idx" ON "karyawan"("tanggal_mcu_berikutnya");

-- CreateIndex
CREATE INDEX "karyawan_tanggal_mcu_expired_idx" ON "karyawan"("tanggal_mcu_expired");

-- CreateIndex
CREATE INDEX "klinik_terkoneksi_idx" ON "klinik"("terkoneksi");

-- CreateIndex
CREATE INDEX "klinik_status_aktif_idx" ON "klinik"("status_aktif");

-- CreateIndex
CREATE INDEX "jadwal_mcu_karyawan_id_idx" ON "jadwal_mcu"("karyawan_id");

-- CreateIndex
CREATE INDEX "jadwal_mcu_departemen_id_idx" ON "jadwal_mcu"("departemen_id");

-- CreateIndex
CREATE INDEX "jadwal_mcu_tanggal_mcu_idx" ON "jadwal_mcu"("tanggal_mcu");

-- CreateIndex
CREATE INDEX "jadwal_mcu_status_pendaftaran_idx" ON "jadwal_mcu"("status_pendaftaran");

-- CreateIndex
CREATE INDEX "jadwal_mcu_jenis_mcu_idx" ON "jadwal_mcu"("jenis_mcu");

-- CreateIndex
CREATE UNIQUE INDEX "surat_pengantar_jadwal_mcu_id_key" ON "surat_pengantar"("jadwal_mcu_id");

-- CreateIndex
CREATE UNIQUE INDEX "surat_pengantar_nomor_surat_key" ON "surat_pengantar"("nomor_surat");

-- CreateIndex
CREATE UNIQUE INDEX "surat_pengantar_tahun_terbit_nomor_urut_key" ON "surat_pengantar"("tahun_terbit", "nomor_urut");

-- CreateIndex
CREATE INDEX "surat_pengantar_status_idx" ON "surat_pengantar"("status");

-- CreateIndex
CREATE INDEX "surat_pengantar_tanggal_terbit_idx" ON "surat_pengantar"("tanggal_terbit");

-- CreateIndex
CREATE UNIQUE INDEX "hasil_mcu_jadwal_mcu_id_key" ON "hasil_mcu"("jadwal_mcu_id");

-- CreateIndex
CREATE INDEX "hasil_mcu_status_review_idx" ON "hasil_mcu"("status_review");

-- CreateIndex
CREATE INDEX "hasil_mcu_retensi_hapus_at_idx" ON "hasil_mcu"("retensi_hapus_at");

-- CreateIndex
CREATE INDEX "hasil_mcu_tanggal_upload_idx" ON "hasil_mcu"("tanggal_upload");

-- CreateIndex
CREATE UNIQUE INDEX "rekomendasi_mcu_hasil_follow_up_asal_id_key" ON "rekomendasi_mcu"("hasil_follow_up_asal_id");

-- CreateIndex
CREATE UNIQUE INDEX "rekomendasi_mcu_nomor_surat_rujukan_key" ON "rekomendasi_mcu"("nomor_surat_rujukan");

-- CreateIndex
CREATE INDEX "rekomendasi_mcu_hasil_mcu_id_idx" ON "rekomendasi_mcu"("hasil_mcu_id");

-- CreateIndex
CREATE INDEX "rekomendasi_mcu_status_idx" ON "rekomendasi_mcu"("status");

-- CreateIndex
CREATE INDEX "rekomendasi_mcu_tanggal_submit_idx" ON "rekomendasi_mcu"("tanggal_submit");

-- CreateIndex
CREATE INDEX "rekomendasi_mcu_retensi_hapus_at_idx" ON "rekomendasi_mcu"("retensi_hapus_at");

-- CreateIndex
CREATE UNIQUE INDEX "follow_up_rekomendasi_id_key" ON "follow_up"("rekomendasi_id");

-- CreateIndex
CREATE INDEX "follow_up_karyawan_id_idx" ON "follow_up"("karyawan_id");

-- CreateIndex
CREATE INDEX "follow_up_status_idx" ON "follow_up"("status");

-- CreateIndex
CREATE INDEX "follow_up_batas_waktu_fu_idx" ON "follow_up"("batas_waktu_fu");

-- CreateIndex
CREATE INDEX "hasil_follow_up_follow_up_id_idx" ON "hasil_follow_up"("follow_up_id");

-- CreateIndex
CREATE INDEX "hasil_follow_up_status_review_idx" ON "hasil_follow_up"("status_review");

-- CreateIndex
CREATE INDEX "hasil_follow_up_retensi_hapus_at_idx" ON "hasil_follow_up"("retensi_hapus_at");

-- CreateIndex
CREATE UNIQUE INDEX "induksi_ulang_rekomendasi_pemicu_id_key" ON "induksi_ulang"("rekomendasi_pemicu_id");

-- CreateIndex
CREATE INDEX "induksi_ulang_karyawan_id_idx" ON "induksi_ulang"("karyawan_id");

-- CreateIndex
CREATE INDEX "induksi_ulang_status_idx" ON "induksi_ulang"("status");

-- CreateIndex
CREATE INDEX "induksi_ulang_tanggal_daftar_idx" ON "induksi_ulang"("tanggal_daftar");

-- CreateIndex
CREATE INDEX "log_notifikasi_mcu_tipe_idx" ON "log_notifikasi_mcu"("tipe");

-- CreateIndex
CREATE INDEX "log_notifikasi_mcu_penerima_id_idx" ON "log_notifikasi_mcu"("penerima_id");

-- CreateIndex
CREATE INDEX "log_notifikasi_mcu_status_kirim_idx" ON "log_notifikasi_mcu"("status_kirim");

-- CreateIndex
CREATE INDEX "log_notifikasi_mcu_ref_tabel_ref_id_idx" ON "log_notifikasi_mcu"("ref_tabel", "ref_id");

-- CreateIndex
CREATE INDEX "log_notifikasi_mcu_created_at_idx" ON "log_notifikasi_mcu"("created_at");

-- AddForeignKey
ALTER TABLE "peran_akun_mcu" ADD CONSTRAINT "peran_akun_mcu_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departemen" ADD CONSTRAINT "departemen_admin_akun_id_fkey" FOREIGN KEY ("admin_akun_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_departemen_id_fkey" FOREIGN KEY ("departemen_id") REFERENCES "departemen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klinik" ADD CONSTRAINT "klinik_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_departemen_id_fkey" FOREIGN KEY ("departemen_id") REFERENCES "departemen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_klinik_id_fkey" FOREIGN KEY ("klinik_id") REFERENCES "klinik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_diubah_oleh_hc_id_fkey" FOREIGN KEY ("diubah_oleh_hc_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_dibuat_oleh_id_fkey" FOREIGN KEY ("dibuat_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_pengantar" ADD CONSTRAINT "surat_pengantar_jadwal_mcu_id_fkey" FOREIGN KEY ("jadwal_mcu_id") REFERENCES "jadwal_mcu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_pengantar" ADD CONSTRAINT "surat_pengantar_klinik_id_fkey" FOREIGN KEY ("klinik_id") REFERENCES "klinik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surat_pengantar" ADD CONSTRAINT "surat_pengantar_diterbitkan_id_fkey" FOREIGN KEY ("diterbitkan_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_mcu" ADD CONSTRAINT "hasil_mcu_jadwal_mcu_id_fkey" FOREIGN KEY ("jadwal_mcu_id") REFERENCES "jadwal_mcu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_mcu" ADD CONSTRAINT "hasil_mcu_diunggah_oleh_id_fkey" FOREIGN KEY ("diunggah_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekomendasi_mcu" ADD CONSTRAINT "rekomendasi_mcu_hasil_mcu_id_fkey" FOREIGN KEY ("hasil_mcu_id") REFERENCES "hasil_mcu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekomendasi_mcu" ADD CONSTRAINT "rekomendasi_mcu_hasil_follow_up_asal_id_fkey" FOREIGN KEY ("hasil_follow_up_asal_id") REFERENCES "hasil_follow_up"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekomendasi_mcu" ADD CONSTRAINT "rekomendasi_mcu_dokter_id_fkey" FOREIGN KEY ("dokter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_rekomendasi_id_fkey" FOREIGN KEY ("rekomendasi_id") REFERENCES "rekomendasi_mcu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_ditetapkan_oleh_hc_id_fkey" FOREIGN KEY ("ditetapkan_oleh_hc_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_klinik_id_fkey" FOREIGN KEY ("klinik_id") REFERENCES "klinik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_follow_up" ADD CONSTRAINT "hasil_follow_up_follow_up_id_fkey" FOREIGN KEY ("follow_up_id") REFERENCES "follow_up"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_follow_up" ADD CONSTRAINT "hasil_follow_up_diunggah_oleh_id_fkey" FOREIGN KEY ("diunggah_oleh_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "induksi_ulang" ADD CONSTRAINT "induksi_ulang_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "induksi_ulang" ADD CONSTRAINT "induksi_ulang_rekomendasi_pemicu_id_fkey" FOREIGN KEY ("rekomendasi_pemicu_id") REFERENCES "rekomendasi_mcu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "induksi_ulang" ADD CONSTRAINT "induksi_ulang_departemen_id_fkey" FOREIGN KEY ("departemen_id") REFERENCES "departemen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "induksi_ulang" ADD CONSTRAINT "induksi_ulang_she_id_fkey" FOREIGN KEY ("she_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_notifikasi_mcu" ADD CONSTRAINT "log_notifikasi_mcu_penerima_id_fkey" FOREIGN KEY ("penerima_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
