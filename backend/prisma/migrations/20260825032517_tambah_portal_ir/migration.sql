-- CreateEnum
CREATE TYPE "KategoriDokumenIr" AS ENUM ('SK', 'IM', 'FORM');

-- CreateEnum
CREATE TYPE "TipeAspirasiPertanyaan" AS ENUM ('PILIHAN_GANDA', 'ESSAY');

-- CreateTable
CREATE TABLE "ir_dokumen" (
    "id" SERIAL NOT NULL,
    "kategori" "KategoriDokumenIr" NOT NULL,
    "judul" TEXT NOT NULL,
    "nama_file" TEXT NOT NULL,
    "url_file" TEXT NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ir_dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_aspirasi_pertanyaan" (
    "id" SERIAL NOT NULL,
    "teks" TEXT NOT NULL,
    "tipe" "TipeAspirasiPertanyaan" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ir_aspirasi_pertanyaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_aspirasi_opsi" (
    "id" SERIAL NOT NULL,
    "pertanyaan_id" INTEGER NOT NULL,
    "teks" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ir_aspirasi_opsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_aspirasi_jawaban" (
    "id" SERIAL NOT NULL,
    "pertanyaan_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "opsi_id" INTEGER,
    "jawaban_teks" TEXT,
    "nama_penjawab" TEXT NOT NULL,
    "nrp_penjawab" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ir_aspirasi_jawaban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_course_video" (
    "id" SERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "url_video" TEXT NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ir_course_video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ir_course_tontonan" (
    "id" SERIAL NOT NULL,
    "video_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "ditonton_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ir_course_tontonan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ir_dokumen_kategori_idx" ON "ir_dokumen"("kategori");

-- CreateIndex
CREATE INDEX "ir_aspirasi_opsi_pertanyaan_id_idx" ON "ir_aspirasi_opsi"("pertanyaan_id");

-- CreateIndex
CREATE INDEX "ir_aspirasi_jawaban_pertanyaan_id_idx" ON "ir_aspirasi_jawaban"("pertanyaan_id");

-- CreateIndex
CREATE UNIQUE INDEX "ir_aspirasi_jawaban_pertanyaan_id_user_id_key" ON "ir_aspirasi_jawaban"("pertanyaan_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ir_course_tontonan_video_id_user_id_key" ON "ir_course_tontonan"("video_id", "user_id");

-- AddForeignKey
ALTER TABLE "ir_dokumen" ADD CONSTRAINT "ir_dokumen_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_aspirasi_pertanyaan" ADD CONSTRAINT "ir_aspirasi_pertanyaan_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_aspirasi_opsi" ADD CONSTRAINT "ir_aspirasi_opsi_pertanyaan_id_fkey" FOREIGN KEY ("pertanyaan_id") REFERENCES "ir_aspirasi_pertanyaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_aspirasi_jawaban" ADD CONSTRAINT "ir_aspirasi_jawaban_pertanyaan_id_fkey" FOREIGN KEY ("pertanyaan_id") REFERENCES "ir_aspirasi_pertanyaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_aspirasi_jawaban" ADD CONSTRAINT "ir_aspirasi_jawaban_opsi_id_fkey" FOREIGN KEY ("opsi_id") REFERENCES "ir_aspirasi_opsi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_aspirasi_jawaban" ADD CONSTRAINT "ir_aspirasi_jawaban_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_course_video" ADD CONSTRAINT "ir_course_video_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_course_tontonan" ADD CONSTRAINT "ir_course_tontonan_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "ir_course_video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ir_course_tontonan" ADD CONSTRAINT "ir_course_tontonan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "eprom_engineer_document_approvals_document_type_document_id_app" RENAME TO "eprom_engineer_document_approvals_document_type_document_id_idx";
