-- CreateEnum
CREATE TYPE "ArahPesanTenderChat" AS ENUM ('KELUAR', 'MASUK');

-- CreateTable
CREATE TABLE "eprom_tender_pesan" (
    "id" SERIAL NOT NULL,
    "undangan_id" INTEGER NOT NULL,
    "arah" "ArahPesanTenderChat" NOT NULL,
    "isi_pesan" TEXT NOT NULL,
    "pengirim_id" INTEGER,
    "message_id" TEXT,
    "in_reply_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_tender_pesan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_tender_pesan_file" (
    "id" SERIAL NOT NULL,
    "pesan_id" INTEGER NOT NULL,
    "nama_file" TEXT NOT NULL,
    "url_file" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_tender_pesan_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eprom_tender_pesan_undangan_id_idx" ON "eprom_tender_pesan"("undangan_id");

-- AddForeignKey
ALTER TABLE "eprom_tender_pesan" ADD CONSTRAINT "eprom_tender_pesan_undangan_id_fkey" FOREIGN KEY ("undangan_id") REFERENCES "eprom_tender_undangan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_pesan" ADD CONSTRAINT "eprom_tender_pesan_pengirim_id_fkey" FOREIGN KEY ("pengirim_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_pesan_file" ADD CONSTRAINT "eprom_tender_pesan_file_pesan_id_fkey" FOREIGN KEY ("pesan_id") REFERENCES "eprom_tender_pesan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
