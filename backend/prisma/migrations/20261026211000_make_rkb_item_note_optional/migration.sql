ALTER TABLE "ga_monitoring_rkb_barang" ALTER COLUMN "keterangan" DROP DEFAULT;
ALTER TABLE "ga_monitoring_rkb_barang" ALTER COLUMN "keterangan" DROP NOT NULL;
UPDATE "ga_monitoring_rkb_barang" SET "keterangan" = NULL;
