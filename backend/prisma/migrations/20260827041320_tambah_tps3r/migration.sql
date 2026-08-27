-- CreateEnum
CREATE TYPE "KategoriTps3r" AS ENUM ('ORGANIK', 'NON_ORGANIK', 'REUSE', 'RECYCLE', 'RESIDU');

-- CreateTable
CREATE TABLE "civil_laporan_tps3r" (
    "id" SERIAL NOT NULL,
    "tanggal" DATE NOT NULL,
    "kategori" "KategoriTps3r" NOT NULL,
    "berat_kg" DOUBLE PRECISION NOT NULL,
    "catatan" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "civil_laporan_tps3r_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "civil_laporan_tps3r_tanggal_idx" ON "civil_laporan_tps3r"("tanggal");

-- CreateIndex
CREATE INDEX "civil_laporan_tps3r_kategori_idx" ON "civil_laporan_tps3r"("kategori");

-- AddForeignKey
ALTER TABLE "civil_laporan_tps3r" ADD CONSTRAINT "civil_laporan_tps3r_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
