ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'HOUSE_MAN';

CREATE TYPE "MessOccupantShift" AS ENUM ('PAGI', 'MALAM', 'CUTI');

CREATE TABLE "mess_rooms" (
  "id" SERIAL NOT NULL,
  "room_number" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mess_rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mess_rooms_room_number_key" ON "mess_rooms"("room_number");

CREATE TABLE "mess_occupants" (
  "id" SERIAL NOT NULL,
  "room_id" INTEGER NOT NULL,
  "nrp" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shift" "MessOccupantShift" NOT NULL DEFAULT 'PAGI',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mess_occupants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mess_occupants_room_id_nrp_key" ON "mess_occupants"("room_id", "nrp");
CREATE INDEX "mess_occupants_room_id_idx" ON "mess_occupants"("room_id");
ALTER TABLE "mess_occupants" ADD CONSTRAINT "mess_occupants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "mess_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mess_cleaning_sessions" (
  "id" SERIAL NOT NULL,
  "room_id" INTEGER NOT NULL,
  "house_man_id" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_sec" INTEGER,
  CONSTRAINT "mess_cleaning_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mess_cleaning_sessions_room_id_started_at_idx" ON "mess_cleaning_sessions"("room_id", "started_at");
CREATE INDEX "mess_cleaning_sessions_house_man_id_started_at_idx" ON "mess_cleaning_sessions"("house_man_id", "started_at");
ALTER TABLE "mess_cleaning_sessions" ADD CONSTRAINT "mess_cleaning_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "mess_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mess_cleaning_sessions" ADD CONSTRAINT "mess_cleaning_sessions_house_man_id_fkey" FOREIGN KEY ("house_man_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
