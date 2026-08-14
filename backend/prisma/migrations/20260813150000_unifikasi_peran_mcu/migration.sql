-- ==================================================
-- UNIFIKASI PERAN MCU KE DALAM UserRole
-- Satu akun = satu role (Bagian 2 alur-workflow-mcu-periodik-v3.md).
-- Menggantikan tabel peran_akun_mcu (many-to-many) yang keliru
-- memungkinkan satu akun memegang lebih dari satu peran MCU.
-- ==================================================

-- Tambah nilai role baru untuk peran MCU
ALTER TYPE "UserRole" ADD VALUE 'ADMIN_DEPT';
ALTER TYPE "UserRole" ADD VALUE 'HC';
ALTER TYPE "UserRole" ADD VALUE 'DOKTER';
ALTER TYPE "UserRole" ADD VALUE 'SHE';
ALTER TYPE "UserRole" ADD VALUE 'KLINIK';

-- Hapus tabel peran ganda dan enum PeranMcu yang sudah tidak dipakai
DROP TABLE "peran_akun_mcu";
DROP TYPE "PeranMcu";
