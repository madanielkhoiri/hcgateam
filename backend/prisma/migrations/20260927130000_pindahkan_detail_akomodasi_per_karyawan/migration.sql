ALTER TABLE "surat_tugas_karyawan"
ADD COLUMN "frekuensi_makan" INTEGER,
ADD COLUMN "rute_transportasi_lokal" TEXT;

-- Pindahkan data yang sempat tersimpan sebagai detail umum ke setiap
-- karyawan agar riwayat tetap terbaca setelah model diperbaiki.
UPDATE "surat_tugas_karyawan" AS k
SET "frekuensi_makan" = s."frekuensi_makan",
    "rute_transportasi_lokal" = s."rute_transportasi_lokal"
FROM "surat_tugas_dinas" AS s
WHERE k."surat_tugas_id" = s."id";

ALTER TABLE "surat_tugas_dinas"
DROP COLUMN "frekuensi_makan",
DROP COLUMN "rute_transportasi_lokal";
