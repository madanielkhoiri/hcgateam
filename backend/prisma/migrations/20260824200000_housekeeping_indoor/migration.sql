-- CreateEnum
CREATE TYPE "LokasiHousekeepingIndoor" AS ENUM ('OFFICE', 'PLANT', 'CSA_GIBSON', 'VIEW_POINT', 'CSA_MONTE_BARU', 'CSA_MONTE_BARU_SUPPORT');

-- CreateTable
CREATE TABLE "ga_housekeeping_indoor" (
    "id" SERIAL NOT NULL,
    "lokasi" "LokasiHousekeepingIndoor" NOT NULL,
    "nama_petugas" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ga_housekeeping_indoor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ga_housekeeping_indoor_foto" (
    "id" SERIAL NOT NULL,
    "laporan_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ga_housekeeping_indoor_foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ga_housekeeping_indoor_lokasi_idx" ON "ga_housekeeping_indoor"("lokasi");

-- CreateIndex
CREATE INDEX "ga_housekeeping_indoor_created_at_idx" ON "ga_housekeeping_indoor"("created_at");

-- CreateIndex
CREATE INDEX "ga_housekeeping_indoor_foto_laporan_id_idx" ON "ga_housekeeping_indoor_foto"("laporan_id");

-- AddForeignKey
ALTER TABLE "ga_housekeeping_indoor" ADD CONSTRAINT "ga_housekeeping_indoor_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ga_housekeeping_indoor_foto" ADD CONSTRAINT "ga_housekeeping_indoor_foto_laporan_id_fkey" FOREIGN KEY ("laporan_id") REFERENCES "ga_housekeeping_indoor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
