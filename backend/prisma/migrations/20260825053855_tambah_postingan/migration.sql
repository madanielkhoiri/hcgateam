-- CreateEnum
CREATE TYPE "TipePostingan" AS ENUM ('POSTER', 'VIDEO');

-- CreateTable
CREATE TABLE "postingan" (
    "id" SERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tipe" "TipePostingan" NOT NULL,
    "url_media" TEXT NOT NULL,
    "tampil_beranda" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postingan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "postingan" ADD CONSTRAINT "postingan_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
