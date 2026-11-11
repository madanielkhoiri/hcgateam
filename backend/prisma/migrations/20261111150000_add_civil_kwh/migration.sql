-- CreateTable
CREATE TABLE "civil_kwh_meter" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "lokasi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "civil_kwh_meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civil_kwh_pencatatan" (
    "id" SERIAL NOT NULL,
    "meter_id" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "stand_meter" DECIMAL(14,2) NOT NULL,
    "tanggal_catat" TIMESTAMP(3) NOT NULL,
    "tepat_waktu" BOOLEAN NOT NULL DEFAULT false,
    "catatan" TEXT,
    "dicatat_oleh" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_kwh_pencatatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "civil_kwh_meter_nama_key" ON "civil_kwh_meter"("nama");

-- CreateIndex
CREATE INDEX "civil_kwh_pencatatan_tahun_bulan_idx" ON "civil_kwh_pencatatan"("tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "civil_kwh_pencatatan_meter_id_tahun_bulan_key" ON "civil_kwh_pencatatan"("meter_id", "tahun", "bulan");

-- AddForeignKey
ALTER TABLE "civil_kwh_pencatatan" ADD CONSTRAINT "civil_kwh_pencatatan_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "civil_kwh_meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "civil_kwh_pencatatan" ADD CONSTRAINT "civil_kwh_pencatatan_dicatat_oleh_fkey" FOREIGN KEY ("dicatat_oleh") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
