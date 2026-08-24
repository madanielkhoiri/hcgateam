-- CreateEnum
CREATE TYPE "StatusTravel" AS ENUM ('DIJADWALKAN', 'BERJALAN', 'SELESAI', 'DIBATALKAN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "driver_id" INTEGER;

-- CreateTable
CREATE TABLE "transport_driver" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "no_telepon" TEXT,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_tiket" (
    "id" SERIAL NOT NULL,
    "karyawan_id" INTEGER NOT NULL,
    "tanggal_mulai" DATE NOT NULL,
    "tanggal_selesai" DATE NOT NULL,
    "keterangan" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_tiket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_tiket_file" (
    "id" SERIAL NOT NULL,
    "tiket_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_tiket_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_travel_jadwal" (
    "id" SERIAL NOT NULL,
    "armada" TEXT NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "asal" TEXT,
    "tujuan" TEXT NOT NULL,
    "waktu_berangkat_rencana" TIMESTAMP(3) NOT NULL,
    "status" "StatusTravel" NOT NULL DEFAULT 'DIJADWALKAN',
    "catatan" TEXT,
    "driver_check_in" TIMESTAMP(3),
    "driver_check_in_foto" TEXT,
    "driver_check_out" TIMESTAMP(3),
    "durasi_menit" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_travel_jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_travel_penumpang" (
    "id" SERIAL NOT NULL,
    "travel_id" INTEGER NOT NULL,
    "karyawan_id" INTEGER NOT NULL,
    "check_in_waktu" TIMESTAMP(3),
    "check_out_waktu" TIMESTAMP(3),
    "rating_bintang" INTEGER,
    "rating_ulasan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_travel_penumpang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_tiket_karyawan_id_idx" ON "transport_tiket"("karyawan_id");

-- CreateIndex
CREATE INDEX "transport_tiket_file_tiket_id_idx" ON "transport_tiket_file"("tiket_id");

-- CreateIndex
CREATE INDEX "transport_travel_jadwal_driver_id_idx" ON "transport_travel_jadwal"("driver_id");

-- CreateIndex
CREATE INDEX "transport_travel_jadwal_waktu_berangkat_rencana_idx" ON "transport_travel_jadwal"("waktu_berangkat_rencana");

-- CreateIndex
CREATE UNIQUE INDEX "transport_travel_penumpang_travel_id_karyawan_id_key" ON "transport_travel_penumpang"("travel_id", "karyawan_id");

-- CreateIndex
CREATE INDEX "transport_travel_penumpang_karyawan_id_idx" ON "transport_travel_penumpang"("karyawan_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transport_driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_tiket" ADD CONSTRAINT "transport_tiket_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_tiket" ADD CONSTRAINT "transport_tiket_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_tiket_file" ADD CONSTRAINT "transport_tiket_file_tiket_id_fkey" FOREIGN KEY ("tiket_id") REFERENCES "transport_tiket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_travel_jadwal" ADD CONSTRAINT "transport_travel_jadwal_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transport_driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_travel_jadwal" ADD CONSTRAINT "transport_travel_jadwal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_travel_penumpang" ADD CONSTRAINT "transport_travel_penumpang_travel_id_fkey" FOREIGN KEY ("travel_id") REFERENCES "transport_travel_jadwal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_travel_penumpang" ADD CONSTRAINT "transport_travel_penumpang_karyawan_id_fkey" FOREIGN KEY ("karyawan_id") REFERENCES "karyawan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
