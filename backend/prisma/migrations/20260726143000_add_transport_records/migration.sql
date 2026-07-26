CREATE TABLE "transport_records" (
  "id" SERIAL NOT NULL,
  "unit_number" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "vehicle_type" TEXT NOT NULL DEFAULT 'LV',
  "fuel_date" DATE NOT NULL,
  "hm_start" DECIMAL(14,2) NOT NULL,
  "hm_end" DECIMAL(14,2) NOT NULL,
  "total_hm" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "hm_per_shift" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "km_per_liter" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_liter" DECIMAL(14,2) NOT NULL,
  "lost_time_bd" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "target_ua" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "actual_ua" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "ua_percentage" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "unit_status" TEXT NOT NULL DEFAULT 'READY',
  "achievement" TEXT NOT NULL DEFAULT 'TERCAPAI',
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transport_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "transport_records_fuel_date_idx" ON "transport_records"("fuel_date");
CREATE INDEX "transport_records_unit_number_idx" ON "transport_records"("unit_number");
CREATE INDEX "transport_records_department_idx" ON "transport_records"("department");
CREATE INDEX "transport_records_created_by_idx" ON "transport_records"("created_by");
ALTER TABLE "transport_records" ADD CONSTRAINT "transport_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
