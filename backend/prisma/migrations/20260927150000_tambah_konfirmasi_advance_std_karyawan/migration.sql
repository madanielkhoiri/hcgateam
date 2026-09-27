ALTER TABLE "surat_tugas_karyawan"
  ADD COLUMN "advance_dikonfirmasi_pada" TIMESTAMP(3),
  ADD COLUMN "advance_dikonfirmasi_oleh_id" INTEGER,
  ADD COLUMN "advance_pembuat_nama" TEXT,
  ADD COLUMN "advance_sh_nama" TEXT,
  ADD COLUMN "advance_sh_jabatan" TEXT,
  ADD COLUMN "advance_file_pdf" TEXT;

CREATE INDEX "surat_tugas_karyawan_advance_dikonfirmasi_oleh_id_idx"
  ON "surat_tugas_karyawan"("advance_dikonfirmasi_oleh_id");

ALTER TABLE "surat_tugas_karyawan"
  ADD CONSTRAINT "surat_tugas_karyawan_advance_dikonfirmasi_oleh_id_fkey"
  FOREIGN KEY ("advance_dikonfirmasi_oleh_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
