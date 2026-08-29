-- CreateEnum
CREATE TYPE "StatusChecklistKip" AS ENUM ('BELUM', 'SUDAH');

-- CreateTable
CREATE TABLE "civil_kip_barcode" (
    "id" SERIAL NOT NULL,
    "kode" TEXT NOT NULL,
    "lokasi" "LokasiHousekeepingIndoor" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_kip_barcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_kip" (
    "id" SERIAL NOT NULL,
    "no_kip" TEXT NOT NULL,
    "jenis_peralatan" TEXT NOT NULL,
    "departemen" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "barcode_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_kip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_kip_checklist_bulan" (
    "id" SERIAL NOT NULL,
    "kip_id" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "status" "StatusChecklistKip" NOT NULL DEFAULT 'BELUM',
    "diperiksa_oleh" INTEGER,
    "tanggal_periksa" TIMESTAMP(3),

    CONSTRAINT "civil_kip_checklist_bulan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "civil_kip_barcode_kode_key" ON "civil_kip_barcode"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "civil_kip_no_kip_key" ON "civil_kip"("no_kip");

-- CreateIndex
CREATE INDEX "civil_kip_barcode_id_idx" ON "civil_kip"("barcode_id");

-- CreateIndex
CREATE UNIQUE INDEX "civil_kip_checklist_bulan_kip_id_bulan_key" ON "civil_kip_checklist_bulan"("kip_id", "bulan");

-- AddForeignKey
ALTER TABLE "civil_kip" ADD CONSTRAINT "civil_kip_barcode_id_fkey" FOREIGN KEY ("barcode_id") REFERENCES "civil_kip_barcode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_kip" ADD CONSTRAINT "civil_kip_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_kip_checklist_bulan" ADD CONSTRAINT "civil_kip_checklist_bulan_kip_id_fkey" FOREIGN KEY ("kip_id") REFERENCES "civil_kip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_kip_checklist_bulan" ADD CONSTRAINT "civil_kip_checklist_bulan_diperiksa_oleh_fkey" FOREIGN KEY ("diperiksa_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
