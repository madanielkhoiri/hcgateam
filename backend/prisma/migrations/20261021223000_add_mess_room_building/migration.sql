ALTER TABLE "mess_rooms" ADD COLUMN "building" TEXT NOT NULL DEFAULT '1';
DROP INDEX "mess_rooms_room_number_key";
CREATE UNIQUE INDEX "mess_rooms_building_room_number_key" ON "mess_rooms"("building", "room_number");
