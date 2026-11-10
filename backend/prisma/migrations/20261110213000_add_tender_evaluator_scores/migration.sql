CREATE TABLE "eprom_evaluasi_vendor_penilai" (
  "id" SERIAL NOT NULL,
  "tender_id" INTEGER NOT NULL,
  "vendor_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "nama_snapshot" TEXT NOT NULL,
  "jabatan_snapshot" TEXT,
  "finalized_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "eprom_evaluasi_vendor_penilai_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eprom_evaluasi_vendor_penilai_tender_id_vendor_id_user_id_key"
  ON "eprom_evaluasi_vendor_penilai"("tender_id", "vendor_id", "user_id");
CREATE INDEX "eprom_evaluasi_vendor_penilai_tender_id_status_idx"
  ON "eprom_evaluasi_vendor_penilai"("tender_id", "status");

ALTER TABLE "eprom_evaluasi_vendor_penilai"
  ADD CONSTRAINT "eprom_evaluasi_vendor_penilai_tender_id_fkey"
  FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eprom_evaluasi_vendor_penilai"
  ADD CONSTRAINT "eprom_evaluasi_vendor_penilai_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eprom_evaluasi_vendor_penilai"
  ADD CONSTRAINT "eprom_evaluasi_vendor_penilai_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
