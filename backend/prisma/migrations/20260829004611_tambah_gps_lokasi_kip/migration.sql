-- CreateTable
CREATE TABLE "civil_kip_lokasi_gps" (
    "lokasi" "LokasiHousekeepingIndoor" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_kip_lokasi_gps_pkey" PRIMARY KEY ("lokasi")
);
