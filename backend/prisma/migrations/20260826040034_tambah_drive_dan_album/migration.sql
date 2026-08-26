-- CreateEnum
CREATE TYPE "ScopeDrive" AS ENUM ('CSR', 'FORM_DOWNLOAD');

-- CreateTable
CREATE TABLE "drive_folder" (
    "id" SERIAL NOT NULL,
    "scope" "ScopeDrive" NOT NULL,
    "nama_folder" TEXT NOT NULL,
    "parent_folder_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_file" (
    "id" SERIAL NOT NULL,
    "folder_id" INTEGER NOT NULL,
    "nama_file" TEXT NOT NULL,
    "url_file" TEXT NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_dokumentasi" (
    "id" SERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_dokumentasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "album_foto" (
    "id" SERIAL NOT NULL,
    "album_id" INTEGER NOT NULL,
    "url_foto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drive_folder_scope_idx" ON "drive_folder"("scope");

-- CreateIndex
CREATE INDEX "drive_folder_parent_folder_id_idx" ON "drive_folder"("parent_folder_id");

-- CreateIndex
CREATE INDEX "drive_file_folder_id_idx" ON "drive_file"("folder_id");

-- CreateIndex
CREATE INDEX "album_foto_album_id_idx" ON "album_foto"("album_id");

-- AddForeignKey
ALTER TABLE "drive_folder" ADD CONSTRAINT "drive_folder_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "drive_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file" ADD CONSTRAINT "drive_file_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "drive_folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file" ADD CONSTRAINT "drive_file_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_dokumentasi" ADD CONSTRAINT "album_dokumentasi_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_foto" ADD CONSTRAINT "album_foto_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "album_dokumentasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
