ALTER TABLE "surat_tugas_dinas"
ADD COLUMN "surat_tugas_asal_id" INTEGER;

CREATE INDEX "surat_tugas_dinas_surat_tugas_asal_id_idx"
ON "surat_tugas_dinas"("surat_tugas_asal_id");

ALTER TABLE "surat_tugas_dinas"
ADD CONSTRAINT "surat_tugas_dinas_surat_tugas_asal_id_fkey"
FOREIGN KEY ("surat_tugas_asal_id")
REFERENCES "surat_tugas_dinas"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
