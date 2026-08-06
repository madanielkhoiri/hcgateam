-- Add role TAMU for guest users
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TAMU';

-- CreateTable
CREATE TABLE "pack_meal_orders" (
    "id" SERIAL NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "needed_date" DATE NOT NULL,
    "delivery_location" TEXT NOT NULL,
    "department" TEXT,
    "contact_number" TEXT,
    "notes" TEXT,
    "approved_form_path" TEXT NOT NULL,
    "total_packs" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_meal_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_meal_order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "order_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delivery_time" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_meal_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pack_meal_orders_order_number_key" ON "pack_meal_orders"("order_number");
CREATE UNIQUE INDEX "pack_meal_orders_order_date_sequence_number_key" ON "pack_meal_orders"("order_date", "sequence_number");
CREATE INDEX "pack_meal_orders_order_date_idx" ON "pack_meal_orders"("order_date");
CREATE INDEX "pack_meal_orders_needed_date_idx" ON "pack_meal_orders"("needed_date");
CREATE INDEX "pack_meal_orders_created_by_idx" ON "pack_meal_orders"("created_by");
CREATE INDEX "pack_meal_order_items_order_id_idx" ON "pack_meal_order_items"("order_id");

-- AddForeignKey
ALTER TABLE "pack_meal_orders" ADD CONSTRAINT "pack_meal_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pack_meal_order_items" ADD CONSTRAINT "pack_meal_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "pack_meal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
