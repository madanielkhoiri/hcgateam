-- CreateEnum
CREATE TYPE "StatusKwitansiObat" AS ENUM ('DISETUJUI', 'DITRANSFER', 'DITOLAK');

-- CreateTable
CREATE TABLE "KwitansiObatNotifikasi" (
    "id" SERIAL NOT NULL,
    "karyawanId" INTEGER NOT NULL,
    "status" "StatusKwitansiObat" NOT NULL,
    "nominal" DECIMAL(15,2),
    "alasan" TEXT,
    "dibuatOlehId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KwitansiObatNotifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KwitansiObatNotifikasi_karyawanId_createdAt_idx" ON "KwitansiObatNotifikasi"("karyawanId", "createdAt");

-- CreateIndex
CREATE INDEX "KwitansiObatNotifikasi_status_createdAt_idx" ON "KwitansiObatNotifikasi"("status", "createdAt");
