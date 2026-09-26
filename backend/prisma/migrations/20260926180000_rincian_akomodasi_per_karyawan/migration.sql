ALTER TABLE "surat_tugas_karyawan"
ADD COLUMN "uang_perjalanan_nominal" INTEGER,
ADD COLUMN "uang_perjalanan_keterangan" TEXT,
ADD COLUMN "akomodasi_nominal" INTEGER,
ADD COLUMN "akomodasi_keterangan" TEXT,
ADD COLUMN "laundry_nominal" INTEGER,
ADD COLUMN "laundry_keterangan" TEXT;

-- Backfill: data lama menyimpan angka agregat pada surat. Bila hanya satu
-- karyawan, pindahkan angka tersebut sebagai rincian yang setara.
UPDATE "surat_tugas_karyawan" AS k
SET "uang_perjalanan_nominal" = s."uang_perjalanan_nominal",
    "uang_perjalanan_keterangan" = s."uang_perjalanan_keterangan",
    "akomodasi_nominal" = s."akomodasi_nominal",
    "akomodasi_keterangan" = s."akomodasi_keterangan",
    "laundry_nominal" = s."laundry_nominal",
    "laundry_keterangan" = s."laundry_keterangan"
FROM "surat_tugas_dinas" AS s
WHERE k."surat_tugas_id" = s."id"
  AND (SELECT COUNT(*) FROM "surat_tugas_karyawan" WHERE "surat_tugas_id" = s."id") = 1;
