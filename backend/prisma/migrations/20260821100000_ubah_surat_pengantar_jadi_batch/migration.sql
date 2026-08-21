-- Ubah Surat Pengantar MCU dari 1 surat per 1 Jadwal MCU menjadi 1 surat
-- bisa mencakup banyak Jadwal MCU sekaligus (batch ke satu klinik tujuan),
-- mengikuti format resmi PPA-ADR-F-HCGA. FK dipindah ke sisi jadwal_mcu
-- (banyak jadwal -> satu surat). Data lama (jika ada) dipindahkan dulu
-- sebelum kolom lama dihapus, supaya tidak hilang.

-- Kolom baru di jadwal_mcu.
ALTER TABLE "jadwal_mcu" ADD COLUMN "jenis_pemeriksaan" TEXT;
ALTER TABLE "jadwal_mcu" ADD COLUMN "surat_pengantar_id" INTEGER;

-- Pindahkan data lama: jadwal yang sudah punya surat pengantar (1:1)
-- diarahkan lewat kolom baru di jadwal_mcu.
UPDATE "jadwal_mcu"
SET "surat_pengantar_id" = "surat_pengantar"."id"
FROM "surat_pengantar"
WHERE "surat_pengantar"."jadwal_mcu_id" = "jadwal_mcu"."id";

-- Hapus relasi lama di surat_pengantar.
ALTER TABLE "surat_pengantar" DROP CONSTRAINT "surat_pengantar_jadwal_mcu_id_fkey";
DROP INDEX "surat_pengantar_jadwal_mcu_id_key";
ALTER TABLE "surat_pengantar" DROP COLUMN "jadwal_mcu_id";

-- Kolom catatan baru di surat_pengantar (opsional, per surat bukan per jadwal).
ALTER TABLE "surat_pengantar" ADD COLUMN "catatan" TEXT;

-- Relasi baru: jadwal_mcu.surat_pengantar_id -> surat_pengantar.id
CREATE INDEX "jadwal_mcu_surat_pengantar_id_idx" ON "jadwal_mcu"("surat_pengantar_id");
ALTER TABLE "jadwal_mcu" ADD CONSTRAINT "jadwal_mcu_surat_pengantar_id_fkey" FOREIGN KEY ("surat_pengantar_id") REFERENCES "surat_pengantar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
