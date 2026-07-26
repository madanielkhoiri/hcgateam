-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('ATK', 'HOUSEKEEPING', 'BAJU');

-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('BATANG', 'BOTOL', 'BUAH', 'CM', 'DERIJEN', 'DUS', 'KARUNG', 'KG', 'KOLI', 'KOTAK', 'LEMBAR', 'LITER', 'LUSI', 'M2', 'M3', 'METER', 'MM', 'PAC', 'PC', 'RET', 'RIM', 'ROLL', 'SAK', 'SET', 'TABUNG', 'TUBE', 'UNIT');

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "unit" "ItemUnit" NOT NULL DEFAULT 'PC',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stocks" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ins" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "item_id" INTEGER NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "ItemUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_outs" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "item_id" INTEGER NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "ItemUnit" NOT NULL,
    "taker" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE INDEX "items_category_idx" ON "items"("category");

-- CreateIndex
CREATE INDEX "items_name_idx" ON "items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stocks_item_id_key" ON "inventory_stocks"("item_id");

-- CreateIndex
CREATE INDEX "stock_ins_date_idx" ON "stock_ins"("date");

-- CreateIndex
CREATE INDEX "stock_ins_item_id_idx" ON "stock_ins"("item_id");

-- CreateIndex
CREATE INDEX "stock_outs_date_idx" ON "stock_outs"("date");

-- CreateIndex
CREATE INDEX "stock_outs_item_id_idx" ON "stock_outs"("item_id");

-- CreateIndex
CREATE INDEX "stock_outs_department_idx" ON "stock_outs"("department");

-- AddForeignKey
ALTER TABLE "inventory_stocks" ADD CONSTRAINT "inventory_stocks_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ins" ADD CONSTRAINT "stock_ins_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_outs" ADD CONSTRAINT "stock_outs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
