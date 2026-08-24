-- CreateTable
CREATE TABLE "eprom_evaluasi_vendor" (
    "id" SERIAL NOT NULL,
    "tender_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "bumdes_kode" INTEGER,
    "bupati_dpr_kode" INTEGER,
    "lingkungan_kode" INTEGER,
    "pekerja_lokal_kode" INTEGER,
    "kepolisian_kode" INTEGER,
    "dlh_kode" INTEGER,
    "dpupr_kode" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_evaluasi_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eprom_evaluasi_vendor_tender_id_vendor_id_key" ON "eprom_evaluasi_vendor"("tender_id", "vendor_id");

-- AddForeignKey
ALTER TABLE "eprom_evaluasi_vendor" ADD CONSTRAINT "eprom_evaluasi_vendor_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_evaluasi_vendor" ADD CONSTRAINT "eprom_evaluasi_vendor_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
