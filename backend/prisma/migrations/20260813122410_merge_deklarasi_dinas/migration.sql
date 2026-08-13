-- CreateEnum
CREATE TYPE "JenisDeklarasi" AS ENUM ('PERJALANAN_DINAS', 'UANG_OPERASIONAL');

-- CreateEnum
CREATE TYPE "StatusDeklarasi" AS ENUM ('DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "KategoriNota" AS ENUM ('MAKAN', 'AKOMODASI', 'TRANSPORTASI', 'LAUNDRY', 'DANA_OPERASIONAL_W1', 'DANA_OPERASIONAL_W2', 'DANA_OPERASIONAL_BOD', 'DANA_OPERASIONAL_BYD', 'DANA_OPERASIONAL_KHUSUS');

-- CreateEnum
CREATE TYPE "StatusVerifikasiNota" AS ENUM ('BELUM_OCR', 'OCR_SELESAI', 'DIVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusDataDatabaseSettlement" AS ENUM ('AKTIF', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusSaldo" AS ENUM ('AKTIF', 'PAS', 'ADA_SISA', 'MELEBIHI_NOMINAL', 'MENUNGGU_PENGEMBALIAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusBuktiPengembalian" AS ENUM ('BELUM_UPLOAD', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_TRANSFER', 'SELESAI');

-- CreateTable
CREATE TABLE "deklarasi" (
    "id" SERIAL NOT NULL,
    "kode_deklarasi" VARCHAR(80) NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "id_saldo" INTEGER,
    "nrp" VARCHAR(50) NOT NULL,
    "nama_pengguna" VARCHAR(120) NOT NULL,
    "jenis_deklarasi" "JenisDeklarasi" NOT NULL,
    "tanggal_kegiatan" DATE NOT NULL,
    "lokasi" VARCHAR(150) NOT NULL,
    "keterangan" TEXT NOT NULL,
    "nomor_std" VARCHAR(120),
    "total_nominal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "StatusDeklarasi" NOT NULL DEFAULT 'DRAFT',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deklarasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota" (
    "id" SERIAL NOT NULL,
    "id_deklarasi" INTEGER NOT NULL,
    "kategori_nota" "KategoriNota",
    "barang_jasa" VARCHAR(255),
    "pic_settlement" VARCHAR(150),
    "keterangan_settlement" TEXT,
    "jumlah_item_settlement" INTEGER NOT NULL DEFAULT 1,
    "nama_file" VARCHAR(180) NOT NULL,
    "path_file" VARCHAR(255) NOT NULL,
    "hasil_ocr_text" TEXT,
    "nominal_ocr" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nominal_final" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "apakah_dikoreksi" BOOLEAN NOT NULL DEFAULT false,
    "alasan_koreksi" TEXT,
    "status_verifikasi" "StatusVerifikasiNota" NOT NULL DEFAULT 'BELUM_OCR',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_settlement" (
    "id" SERIAL NOT NULL,
    "id_deklarasi" INTEGER NOT NULL,
    "id_saldo" INTEGER,
    "id_pengguna" INTEGER NOT NULL,
    "kode_jangan_diubah" VARCHAR(50) NOT NULL,
    "nomor_settlement" VARCHAR(50) NOT NULL,
    "item" INTEGER NOT NULL,
    "item_sett" VARCHAR(50) NOT NULL,
    "department" VARCHAR(120) NOT NULL DEFAULT 'HCGA',
    "tanggal_pembuatan" DATE NOT NULL,
    "tanggal_per_item" DATE NOT NULL,
    "nama_barang_jasa" VARCHAR(255) NOT NULL,
    "qty" DECIMAL(15,2) NOT NULL DEFAULT 1,
    "harga_per_qty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "cost_center" VARCHAR(120) NOT NULL DEFAULT 'HCGA',
    "nomor_rab_pb" VARCHAR(160),
    "pic" VARCHAR(150),
    "status_data" "StatusDataDatabaseSettlement" NOT NULL DEFAULT 'AKTIF',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo" (
    "id" SERIAL NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "nrp" TEXT NOT NULL,
    "nama_pengguna" TEXT NOT NULL,
    "lokasi" VARCHAR(120),
    "jenis_saldo" "JenisDeklarasi" NOT NULL,
    "nominal_transfer" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_penggunaan" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sisa_saldo" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nominal_pengembalian" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tanggal_transfer" DATE NOT NULL,
    "keterangan" TEXT,
    "nomor_std" VARCHAR(120),
    "status_saldo" "StatusSaldo" NOT NULL DEFAULT 'AKTIF',
    "nama_file_bukti_pengembalian" VARCHAR(255),
    "path_file_bukti_pengembalian" VARCHAR(255),
    "status_bukti_pengembalian" "StatusBuktiPengembalian" NOT NULL DEFAULT 'BELUM_UPLOAD',
    "alasan_bukti_pengembalian_ditolak" TEXT,
    "tanggal_upload_bukti_pengembalian" TIMESTAMP,
    "tanggal_verifikasi_pengembalian" TIMESTAMP,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengajuan" (
    "id" SERIAL NOT NULL,
    "id_pengguna" INTEGER NOT NULL,
    "nrp" VARCHAR(50) NOT NULL,
    "nama_pengguna" VARCHAR(150) NOT NULL,
    "jenis_pengajuan" "JenisDeklarasi" NOT NULL DEFAULT 'PERJALANAN_DINAS',
    "lokasi" VARCHAR(120),
    "keterangan" TEXT,
    "nomor_std" VARCHAR(120),
    "nomor_rab" VARCHAR(120),
    "nama_file_std" VARCHAR(255),
    "path_file_std" VARCHAR(255),
    "nama_file_rab" VARCHAR(255) NOT NULL,
    "path_file_rab" VARCHAR(255) NOT NULL,
    "nominal_transfer" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nama_file_bukti_transfer" VARCHAR(255),
    "path_file_bukti_transfer" VARCHAR(255),
    "tanggal_transfer" DATE,
    "id_saldo" INTEGER,
    "status_pengajuan" "StatusPengajuan" NOT NULL DEFAULT 'DIAJUKAN',
    "catatan_admin" TEXT,
    "tanggal_pengajuan" DATE NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengajuan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deklarasi_kode_deklarasi_key" ON "deklarasi"("kode_deklarasi");

-- CreateIndex
CREATE UNIQUE INDEX "database_settlement_id_deklarasi_item_key" ON "database_settlement"("id_deklarasi", "item");
