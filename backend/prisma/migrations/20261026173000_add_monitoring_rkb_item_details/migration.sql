CREATE TYPE "KeteranganRkb" AS ENUM ('SESUAI', 'TIDAK_SESUAI');

ALTER TABLE "ga_monitoring_rkb_barang"
ADD COLUMN "keterangan" "KeteranganRkb" NOT NULL DEFAULT 'SESUAI',
ADD COLUMN "foto_url" TEXT;
