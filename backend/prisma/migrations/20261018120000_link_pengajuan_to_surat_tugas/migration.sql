ALTER TABLE "pengajuan"
ADD COLUMN "surat_tugas_id" INTEGER;

-- Hubungkan hanya pengajuan yang memakai PDF bersama milik modul STD.
-- Upload STD manual tetap tidak memiliki relasi walaupun nomor suratnya sama.
UPDATE "pengajuan" AS p
SET "surat_tugas_id" = s."id"
FROM "surat_tugas_dinas" AS s
WHERE p."nomor_std" = s."nomor"
  AND p."path_file_std" LIKE '/uploads/surat-tugas-dinas/%';

CREATE INDEX "pengajuan_surat_tugas_id_idx"
ON "pengajuan"("surat_tugas_id");

ALTER TABLE "pengajuan"
ADD CONSTRAINT "pengajuan_surat_tugas_id_fkey"
FOREIGN KEY ("surat_tugas_id") REFERENCES "surat_tugas_dinas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
