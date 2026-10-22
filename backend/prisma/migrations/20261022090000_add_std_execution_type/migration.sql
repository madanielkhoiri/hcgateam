CREATE TYPE "JenisPelaksanaanTugas" AS ENUM ('ONLINE', 'OFFLINE');

ALTER TABLE "surat_tugas_dinas"
ADD COLUMN "jenis_pelaksanaan" "JenisPelaksanaanTugas" NOT NULL DEFAULT 'OFFLINE';

DROP INDEX "surat_tugas_dinas_nomor_key";

CREATE UNIQUE INDEX "surat_tugas_dinas_nomor_dengan_akomodasi_key"
ON "surat_tugas_dinas"("nomor", "dengan_akomodasi");
