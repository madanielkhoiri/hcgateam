CREATE TABLE "mining_pack_meal_entries" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "area" TEXT NOT NULL,
    "drop_location" TEXT,
    "drop_times" TEXT,
    "ordered_by" TEXT,
    "notes" TEXT,
    "roster_lunch" INTEGER NOT NULL DEFAULT 0,
    "roster_dinner" INTEGER NOT NULL DEFAULT 0,
    "roster_special_meal" INTEGER NOT NULL DEFAULT 0,
    "roster_special_snack" INTEGER NOT NULL DEFAULT 0,
    "additional_lunch" INTEGER NOT NULL DEFAULT 0,
    "additional_dinner" INTEGER NOT NULL DEFAULT 0,
    "additional_special_meal" INTEGER NOT NULL DEFAULT 0,
    "additional_special_snack" INTEGER NOT NULL DEFAULT 0,
    "received_lunch" INTEGER,
    "received_dinner" INTEGER,
    "received_special_meal" INTEGER,
    "received_special_snack" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mining_pack_meal_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mining_pack_meal_entries_date_area_key" ON "mining_pack_meal_entries"("date", "area");
CREATE INDEX "mining_pack_meal_entries_date_idx" ON "mining_pack_meal_entries"("date");
CREATE INDEX "mining_pack_meal_entries_area_idx" ON "mining_pack_meal_entries"("area");
CREATE INDEX "mining_pack_meal_entries_created_by_idx" ON "mining_pack_meal_entries"("created_by");

ALTER TABLE "mining_pack_meal_entries"
ADD CONSTRAINT "mining_pack_meal_entries_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
