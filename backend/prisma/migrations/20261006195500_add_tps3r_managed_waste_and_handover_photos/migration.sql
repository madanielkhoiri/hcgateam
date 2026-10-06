CREATE TABLE "civil_sampah_terkelola_tps3r" (
  "id" SERIAL NOT NULL,
  "tanggal" DATE NOT NULL,
  "berat_organik" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "berat_reuse" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "berat_recycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "berat_residu" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "civil_sampah_terkelola_tps3r_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "civil_sampah_terkelola_tps3r_tanggal_idx" ON "civil_sampah_terkelola_tps3r"("tanggal");
ALTER TABLE "civil_sampah_terkelola_tps3r" ADD CONSTRAINT "civil_sampah_terkelola_tps3r_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "civil_foto_penyerahan_tps3r" (
  "id" SERIAL NOT NULL,
  "tanggal" DATE NOT NULL,
  "url_foto" TEXT NOT NULL,
  "created_by_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "civil_foto_penyerahan_tps3r_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "civil_foto_penyerahan_tps3r_tanggal_idx" ON "civil_foto_penyerahan_tps3r"("tanggal");
ALTER TABLE "civil_foto_penyerahan_tps3r" ADD CONSTRAINT "civil_foto_penyerahan_tps3r_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
