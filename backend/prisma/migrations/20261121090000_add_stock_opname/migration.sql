
-- CreateEnum
CREATE TYPE "StatusStockOpname" AS ENUM ('BERJALAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "KondisiBarangOpname" AS ENUM ('BAIK', 'RUSAK', 'KADALUARSA');

-- CreateTable
CREATE TABLE "stock_opname" (
    "id" SERIAL NOT NULL,
    "nomor" TEXT NOT NULL,
    "inventory_scope" "InventoryScope" NOT NULL,
    "lokasi_gudang" "LokasiGudang",
    "status" "StatusStockOpname" NOT NULL DEFAULT 'BERJALAN',
    "catatan" TEXT,
    "dibuat_oleh_id" INTEGER NOT NULL,
    "dibuat_oleh_nama" TEXT NOT NULL,
    "selesai_oleh_id" INTEGER,
    "selesai_oleh_nama" TEXT,
    "selesai_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_opname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_opname_items" (
    "id" SERIAL NOT NULL,
    "opname_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "stok_sistem" INTEGER NOT NULL,
    "stok_fisik" INTEGER,
    "kondisi" "KondisiBarangOpname",
    "catatan" TEXT,
    "dicek_oleh_nama" TEXT,
    "dicek_at" TIMESTAMP(3),

    CONSTRAINT "stock_opname_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_opname_nomor_key" ON "stock_opname"("nomor");

-- CreateIndex
CREATE INDEX "stock_opname_inventory_scope_status_idx" ON "stock_opname"("inventory_scope", "status");

-- CreateIndex
CREATE INDEX "stock_opname_created_at_idx" ON "stock_opname"("created_at");

-- CreateIndex
CREATE INDEX "stock_opname_items_item_id_idx" ON "stock_opname_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_opname_items_opname_id_item_id_key" ON "stock_opname_items"("opname_id", "item_id");

-- AddForeignKey
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_fkey" FOREIGN KEY ("opname_id") REFERENCES "stock_opname"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

