CREATE TABLE "monitoring_project_tambang" (
  "id" SERIAL NOT NULL,
  "nama_pekerjaan" TEXT NOT NULL,
  "pengajuan_project_charter" BOOLEAN NOT NULL DEFAULT false,
  "review_approval_ai" BOOLEAN NOT NULL DEFAULT false,
  "pengecekan_area" BOOLEAN NOT NULL DEFAULT false,
  "dokumen_project" BOOLEAN NOT NULL DEFAULT false,
  "kick_off_meeting" BOOLEAN NOT NULL DEFAULT false,
  "pelaksanaan" BOOLEAN NOT NULL DEFAULT false,
  "komisioning" BOOLEAN NOT NULL DEFAULT false,
  "selesai" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" INTEGER NOT NULL,
  "created_by_name" TEXT NOT NULL,
  "updated_by_id" INTEGER NOT NULL,
  "updated_by_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "monitoring_project_tambang_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monitoring_project_tambang_riwayat" (
  "id" SERIAL NOT NULL,
  "project_id" INTEGER NOT NULL,
  "field" TEXT NOT NULL,
  "nilai_sebelum" TEXT,
  "nilai_sesudah" TEXT,
  "actor_id" INTEGER NOT NULL,
  "actor_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monitoring_project_tambang_riwayat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "monitoring_project_tambang_updated_at_idx" ON "monitoring_project_tambang"("updated_at");
CREATE INDEX "monitoring_project_tambang_riwayat_project_id_created_at_idx" ON "monitoring_project_tambang_riwayat"("project_id", "created_at");
ALTER TABLE "monitoring_project_tambang_riwayat" ADD CONSTRAINT "monitoring_project_tambang_riwayat_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "monitoring_project_tambang"("id") ON DELETE CASCADE ON UPDATE CASCADE;
