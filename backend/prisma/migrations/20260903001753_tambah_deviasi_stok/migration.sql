-- CreateEnum
CREATE TYPE "JenisDeviasiStok" AS ENUM ('KURANG', 'LEBIH');

-- CreateTable
CREATE TABLE "deviasi_stok" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "stok_lama" INTEGER NOT NULL,
    "stok_baru" INTEGER NOT NULL,
    "selisih" INTEGER NOT NULL,
    "jenis" "JenisDeviasiStok" NOT NULL,
    "diubah_oleh" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deviasi_stok_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deviasi_stok_item_id_idx" ON "deviasi_stok"("item_id");

-- CreateIndex
CREATE INDEX "deviasi_stok_created_at_idx" ON "deviasi_stok"("created_at");

-- AddForeignKey
ALTER TABLE "deviasi_stok" ADD CONSTRAINT "deviasi_stok_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviasi_stok" ADD CONSTRAINT "deviasi_stok_diubah_oleh_fkey" FOREIGN KEY ("diubah_oleh") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
