ALTER TABLE "ga_monitoring_rkb_barang"
ADD COLUMN "status" "StatusRkb" NOT NULL DEFAULT 'WAITING_APPROVAL';

UPDATE "ga_monitoring_rkb_barang" AS barang
SET "status" = rkb."status"
FROM "ga_monitoring_rkb" AS rkb
WHERE barang."rkb_id" = rkb."id";
