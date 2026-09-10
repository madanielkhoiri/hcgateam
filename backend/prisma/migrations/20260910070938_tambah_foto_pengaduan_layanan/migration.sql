-- CreateTable
CREATE TABLE "pengaduan_layanan_foto" (
    "id" SERIAL NOT NULL,
    "pengaduan_id" INTEGER NOT NULL,
    "url_foto" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengaduan_layanan_foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pengaduan_layanan_foto_pengaduan_id_idx" ON "pengaduan_layanan_foto"("pengaduan_id");

-- AddForeignKey
ALTER TABLE "pengaduan_layanan_foto" ADD CONSTRAINT "pengaduan_layanan_foto_pengaduan_id_fkey" FOREIGN KEY ("pengaduan_id") REFERENCES "pengaduan_layanan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
