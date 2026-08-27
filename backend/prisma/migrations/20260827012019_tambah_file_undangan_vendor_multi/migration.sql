-- CreateTable
CREATE TABLE "eprom_tender_undangan_file" (
    "id" SERIAL NOT NULL,
    "undangan_id" INTEGER NOT NULL,
    "nama_file" TEXT NOT NULL,
    "url_file" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_tender_undangan_file_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "eprom_tender_undangan_file" ADD CONSTRAINT "eprom_tender_undangan_file_undangan_id_fkey" FOREIGN KEY ("undangan_id") REFERENCES "eprom_tender_undangan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
