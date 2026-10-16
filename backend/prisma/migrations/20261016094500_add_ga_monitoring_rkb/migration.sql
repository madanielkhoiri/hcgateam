CREATE TYPE "KategoriRkb" AS ENUM ('PROJECT', 'MAINTENANCE');
CREATE TYPE "StatusRkb" AS ENUM ('WAITING_APPROVAL', 'WAITING_SUPPLY', 'CLOSE');

CREATE TABLE "ga_monitoring_rkb" (
  "id" SERIAL NOT NULL,
  "tanggal" DATE NOT NULL,
  "nomor_rkb" TEXT NOT NULL,
  "kategori" "KategoriRkb" NOT NULL,
  "status" "StatusRkb" NOT NULL DEFAULT 'WAITING_APPROVAL',
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ga_monitoring_rkb_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ga_monitoring_rkb_barang" (
  "id" SERIAL NOT NULL,
  "rkb_id" INTEGER NOT NULL,
  "nama_barang" TEXT NOT NULL,
  "qty" DECIMAL(15,2) NOT NULL,
  "satuan" TEXT NOT NULL,
  "urutan" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ga_monitoring_rkb_barang_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ga_monitoring_rkb_nomor_rkb_key" ON "ga_monitoring_rkb"("nomor_rkb");
CREATE INDEX "ga_monitoring_rkb_kategori_status_idx" ON "ga_monitoring_rkb"("kategori", "status");
CREATE INDEX "ga_monitoring_rkb_tanggal_idx" ON "ga_monitoring_rkb"("tanggal");
CREATE INDEX "ga_monitoring_rkb_barang_rkb_id_urutan_idx" ON "ga_monitoring_rkb_barang"("rkb_id", "urutan");
ALTER TABLE "ga_monitoring_rkb_barang" ADD CONSTRAINT "ga_monitoring_rkb_barang_rkb_id_fkey" FOREIGN KEY ("rkb_id") REFERENCES "ga_monitoring_rkb"("id") ON DELETE CASCADE ON UPDATE CASCADE;
