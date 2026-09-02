-- CreateEnum
CREATE TYPE "DivisiPengaduan" AS ENUM ('HC', 'GA', 'CIVIL');

-- CreateTable
CREATE TABLE "pengaduan_layanan" (
    "id" SERIAL NOT NULL,
    "divisi" "DivisiPengaduan" NOT NULL,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "pengirim_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengaduan_layanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pengaduan_layanan_divisi_created_at_idx" ON "pengaduan_layanan"("divisi", "created_at");

-- CreateIndex
CREATE INDEX "pengaduan_layanan_pengirim_id_idx" ON "pengaduan_layanan"("pengirim_id");

-- AddForeignKey
ALTER TABLE "pengaduan_layanan" ADD CONSTRAINT "pengaduan_layanan_pengirim_id_fkey" FOREIGN KEY ("pengirim_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
