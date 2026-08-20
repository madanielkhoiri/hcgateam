-- CreateEnum
CREATE TYPE "StatusTiketHelpdesk" AS ENUM ('TERBUKA', 'DIPROSES', 'SELESAI');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "departemen" TEXT,
ADD COLUMN     "jabatan" TEXT;

-- CreateTable
CREATE TABLE "tiket_helpdesk" (
    "id" SERIAL NOT NULL,
    "nomor_tiket" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "lampiran" TEXT,
    "nama_file_asli" TEXT,
    "status" "StatusTiketHelpdesk" NOT NULL DEFAULT 'TERBUKA',
    "level" TEXT,
    "catatan_penyelesaian" TEXT,
    "pembuat_id" INTEGER NOT NULL,
    "pic_id" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diproses_pada" TIMESTAMP(3),
    "selesai_pada" TIMESTAMP(3),

    CONSTRAINT "tiket_helpdesk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiket_helpdesk_nomor_tiket_key" ON "tiket_helpdesk"("nomor_tiket");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_helpdesk_sequence_number_key" ON "tiket_helpdesk"("sequence_number");

-- CreateIndex
CREATE INDEX "tiket_helpdesk_status_idx" ON "tiket_helpdesk"("status");

-- CreateIndex
CREATE INDEX "tiket_helpdesk_dibuat_pada_idx" ON "tiket_helpdesk"("dibuat_pada");

-- AddForeignKey
ALTER TABLE "tiket_helpdesk" ADD CONSTRAINT "tiket_helpdesk_pembuat_id_fkey" FOREIGN KEY ("pembuat_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiket_helpdesk" ADD CONSTRAINT "tiket_helpdesk_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
