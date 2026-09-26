-- CreateTable
CREATE TABLE "tiket_billing" (
    "id" SERIAL NOT NULL,
    "nama_rekapan" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nama_file_zip" TEXT NOT NULL,
    "jumlah_invoice" INTEGER NOT NULL,
    "sub_total" INTEGER NOT NULL,
    "file_pdf" TEXT NOT NULL,
    "ppn" INTEGER,
    "pph23" INTEGER,
    "grand_total_vendor" INTEGER,
    "grand_total_hitung" INTEGER,
    "dihitung_oleh_id" INTEGER,
    "dihitung_pada" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiket_billing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tiket_billing_bulan_tahun_idx" ON "tiket_billing"("bulan", "tahun");

-- CreateIndex
CREATE INDEX "tiket_billing_created_by_idx" ON "tiket_billing"("created_by");

-- AddForeignKey
ALTER TABLE "tiket_billing" ADD CONSTRAINT "tiket_billing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_billing" ADD CONSTRAINT "tiket_billing_dihitung_oleh_id_fkey" FOREIGN KEY ("dihitung_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
