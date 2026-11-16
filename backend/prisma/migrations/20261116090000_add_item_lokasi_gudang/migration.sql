-- Lokasi fisik barang Inventory Electric (GA MEP): Gudang GA / Gudang Elektrik.
CREATE TYPE "LokasiGudang" AS ENUM ('GUDANG_GA', 'GUDANG_ELEKTRIK');

ALTER TABLE "items" ADD COLUMN "lokasi_gudang" "LokasiGudang";

-- Barang Electric yang sudah ada diisi Gudang Elektrik dulu; admin mengubah yang sebenarnya di Gudang GA.
UPDATE "items" SET "lokasi_gudang" = 'GUDANG_ELEKTRIK' WHERE "inventory_scope" = 'ELECTRIC';
