-- CreateEnum
CREATE TYPE "JenisTiket" AS ENUM ('PULANG_PERGI', 'BERANGKAT_SAJA', 'PULANG_SAJA');

-- AlterTable
ALTER TABLE "transport_tiket" ADD COLUMN     "jam_mulai" TEXT,
ADD COLUMN     "jam_selesai" TEXT,
ADD COLUMN     "jenis_tiket" "JenisTiket" NOT NULL DEFAULT 'PULANG_PERGI',
ALTER COLUMN "tanggal_mulai" DROP NOT NULL,
ALTER COLUMN "tanggal_selesai" DROP NOT NULL;
