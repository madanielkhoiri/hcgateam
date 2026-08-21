/*
  Warnings:

  - You are about to drop the column `asal_kampus` on the `anak_magang` table. All the data in the column will be lost.
  - You are about to drop the column `nim` on the `anak_magang` table. All the data in the column will be lost.
  - You are about to drop the column `nim` on the `surat_balasan_magang_baris` table. All the data in the column will be lost.
  - Added the required column `nrp` to the `surat_balasan_magang_baris` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "anak_magang" DROP COLUMN "asal_kampus",
DROP COLUMN "nim",
ADD COLUMN     "agama" TEXT,
ADD COLUMN     "alamat" TEXT,
ADD COLUMN     "bank" TEXT,
ADD COLUMN     "bpjs_kesehatan" TEXT,
ADD COLUMN     "bpjs_tk" TEXT,
ADD COLUMN     "departemen" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "golongan_darah" TEXT,
ADD COLUMN     "jabatan" TEXT,
ADD COLUMN     "marital_status" TEXT,
ADD COLUMN     "nama_rekening" TEXT,
ADD COLUMN     "no_hp" TEXT,
ADD COLUMN     "no_ktp" TEXT,
ADD COLUMN     "nomor_rekening" TEXT,
ADD COLUMN     "npwp" TEXT,
ADD COLUMN     "pendidikan" TEXT,
ADD COLUMN     "posisi" TEXT,
ADD COLUMN     "site" TEXT,
ADD COLUMN     "tanggal_induksi" DATE,
ADD COLUMN     "tanggal_lahir" DATE,
ADD COLUMN     "tanggal_mcu" DATE,
ADD COLUMN     "tanggal_mulai" DATE,
ADD COLUMN     "tanggal_pemeriksaan" DATE,
ADD COLUMN     "tanggal_selesai" DATE,
ADD COLUMN     "tempat_lahir" TEXT,
ADD COLUMN     "ukuran_baju" TEXT,
ADD COLUMN     "universitas" TEXT;

-- AlterTable
ALTER TABLE "surat_balasan_magang_baris" DROP COLUMN "nim",
ADD COLUMN     "nrp" TEXT NOT NULL;
