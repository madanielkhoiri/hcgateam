/*
  Warnings:

  - A unique constraint covering the columns `[inventory_scope,code]` on the table `items` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InventoryScope" AS ENUM ('GENERAL', 'MESS', 'ELECTRIC');

-- DropIndex
DROP INDEX "items_code_key";

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "inventory_scope" "InventoryScope" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "items_inventory_scope_idx" ON "items"("inventory_scope");

-- CreateIndex
CREATE INDEX "items_inventory_scope_category_idx" ON "items"("inventory_scope", "category");

-- CreateIndex
CREATE UNIQUE INDEX "items_inventory_scope_code_key" ON "items"("inventory_scope", "code");
