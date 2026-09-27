ALTER TABLE "surat_tugas_dinas"
ADD COLUMN "dengan_akomodasi" BOOLEAN NOT NULL DEFAULT false;

-- Pertahankan kategori dokumen lama yang memang sudah berisi data akomodasi.
UPDATE "surat_tugas_dinas" AS s
SET "dengan_akomodasi" = true
WHERE s."penginapan_hotel" IS NOT NULL
   OR s."bantuan_transportasi" IS NOT NULL
   OR s."uang_perjalanan_nominal" IS NOT NULL
   OR s."akomodasi_nominal" IS NOT NULL
   OR s."laundry_nominal" IS NOT NULL
   OR s."jumlah_akomodasi" <> 0
   OR EXISTS (
     SELECT 1
     FROM "surat_tugas_karyawan" AS k
     WHERE k."surat_tugas_id" = s."id"
       AND (
         k."uang_perjalanan_nominal" IS NOT NULL
         OR k."uang_perjalanan_keterangan" IS NOT NULL
         OR k."akomodasi_nominal" IS NOT NULL
         OR k."akomodasi_keterangan" IS NOT NULL
         OR k."laundry_nominal" IS NOT NULL
         OR k."laundry_keterangan" IS NOT NULL
       )
   );
