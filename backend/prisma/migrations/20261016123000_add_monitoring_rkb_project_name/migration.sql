CREATE TABLE "ga_monitoring_rkb_project" (
  "id" SERIAL NOT NULL,
  "nama_project" TEXT NOT NULL,
  "kategori" "KategoriRkb" NOT NULL,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ga_monitoring_rkb_project_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ga_monitoring_rkb" ADD COLUMN "project_id" INTEGER;

INSERT INTO "ga_monitoring_rkb_project" ("nama_project", "kategori", "created_by_id", "created_at", "updated_at")
SELECT 'Project ' || "nomor_rkb", "kategori", "created_by_id", "created_at", CURRENT_TIMESTAMP
FROM "ga_monitoring_rkb";

UPDATE "ga_monitoring_rkb" r
SET "project_id" = p."id"
FROM "ga_monitoring_rkb_project" p
WHERE p."nama_project" = 'Project ' || r."nomor_rkb" AND p."created_by_id" = r."created_by_id";

ALTER TABLE "ga_monitoring_rkb" ALTER COLUMN "project_id" SET NOT NULL;
CREATE INDEX "ga_monitoring_rkb_project_kategori_idx" ON "ga_monitoring_rkb_project"("kategori");
CREATE INDEX "ga_monitoring_rkb_project_id_status_idx" ON "ga_monitoring_rkb"("project_id", "status");
ALTER TABLE "ga_monitoring_rkb" ADD CONSTRAINT "ga_monitoring_rkb_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ga_monitoring_rkb_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
