-- Add configurable module access for every account
ALTER TABLE "users"
ADD COLUMN "access_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing staff retain access to every current portal section.
UPDATE "users"
SET "access_keys" = CASE
  WHEN "role"::text = 'TAMU' THEN ARRAY['GA', 'GA_ORDER_PACK_MEAL']::TEXT[]
  ELSE ARRAY[
    'HC',
    'GA',
    'GA_INVENTORY',
    'GA_PEKERJAAN',
    'GA_AKTIVITAS_HARIAN',
    'GA_PROJECT',
    'GA_SAFETY_MEETING',
    'GA_TRANSPORT',
    'GA_ORDER_PACK_MEAL',
    'GA_GENERAL_SERVICE',
    'SIPIL'
  ]::TEXT[]
END;

-- Jam antar berlaku untuk satu order, bukan untuk setiap baris jenis order.
ALTER TABLE "pack_meal_orders"
ADD COLUMN "delivery_time" TEXT;

-- Preserve the first available delivery time from old order rows.
UPDATE "pack_meal_orders" AS orders
SET "delivery_time" = source."delivery_time"
FROM (
  SELECT DISTINCT ON ("order_id")
    "order_id",
    "delivery_time"
  FROM "pack_meal_order_items"
  WHERE "delivery_time" IS NOT NULL
    AND BTRIM("delivery_time") <> ''
  ORDER BY "order_id", "id"
) AS source
WHERE orders."id" = source."order_id";

ALTER TABLE "pack_meal_order_items"
DROP COLUMN "delivery_time";
