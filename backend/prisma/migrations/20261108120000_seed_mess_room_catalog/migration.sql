-- Katalog kamar baku Mess A-F.
INSERT INTO "mess_rooms" ("building", "room_number", "created_at", "updated_at")
SELECT building, building || room_number::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS buildings(building)
CROSS JOIN LATERAL (
  SELECT generate_series(101, 117) AS room_number
  UNION ALL
  SELECT generate_series(201, 218) AS room_number
) AS rooms
ON CONFLICT ("building", "room_number") DO NOTHING;

-- Katalog Staff 1-3. Nilai building tetap 1/2/3 agar kompatibel dengan data lama.
INSERT INTO "mess_rooms" ("building", "room_number", "created_at", "updated_at")
SELECT building, (building || room_number::text), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES ('1'), ('2'), ('3')) AS buildings(building)
CROSS JOIN LATERAL (
  SELECT generate_series(101, 116) AS room_number
  UNION ALL
  SELECT generate_series(201, 218) AS room_number
) AS rooms
ON CONFLICT ("building", "room_number") DO NOTHING;
