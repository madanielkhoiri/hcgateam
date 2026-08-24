-- CreateEnum
CREATE TYPE "StatusLegalitasVendor" AS ENUM ('BELUM_LENGKAP', 'LENGKAP');

-- CreateEnum
CREATE TYPE "StatusTender" AS ENUM ('PERSIAPAN', 'UNDANGAN_TERKIRIM', 'EVALUASI_SPH', 'SELESAI');

-- CreateEnum
CREATE TYPE "ScopeDocumentFolder" AS ENUM ('TENDER_DOKUMEN', 'LEGALITAS_VENDOR');

-- CreateEnum
CREATE TYPE "TipeFileEprom" AS ENUM ('PDF', 'RAB', 'CAD', 'FOTO');

-- CreateEnum
CREATE TYPE "StatusApprovalEprom" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TipeLinkMeeting" AS ENUM ('MINGGUAN', 'BULANAN');

-- CreateEnum
CREATE TYPE "TipeDokumenSurat" AS ENUM ('SURAT_TEGURAN', 'SURAT_PERINGATAN', 'COACHING_COUNSELING', 'MEMO');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- CreateTable
CREATE TABLE "eprom_vendors" (
    "id" SERIAL NOT NULL,
    "nama_vendor" TEXT NOT NULL,
    "npwp" TEXT,
    "legalitas_status" "StatusLegalitasVendor" NOT NULL DEFAULT 'BELUM_LENGKAP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_tender_process" (
    "id" SERIAL NOT NULL,
    "nama_tender" TEXT NOT NULL,
    "status" "StatusTender" NOT NULL DEFAULT 'PERSIAPAN',
    "tanggal_mulai" DATE,
    "tanggal_selesai" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_tender_process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_tender_undangan" (
    "id" SERIAL NOT NULL,
    "tender_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "file_undangan" TEXT,
    "tanggal_kirim" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_tender_undangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_tender_sph" (
    "id" SERIAL NOT NULL,
    "tender_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "round_ke" INTEGER NOT NULL,
    "file_sph" TEXT,
    "harga_penawaran" DECIMAL(18,2),
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "status_pemenang" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_tender_sph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_document_folders" (
    "id" SERIAL NOT NULL,
    "scope" "ScopeDocumentFolder" NOT NULL,
    "tender_id" INTEGER,
    "vendor_id" INTEGER,
    "nama_folder" TEXT NOT NULL,
    "parent_folder_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_file_uploads" (
    "id" SERIAL NOT NULL,
    "folder_id" INTEGER NOT NULL,
    "nama_file" TEXT NOT NULL,
    "tipe_file" "TipeFileEprom" NOT NULL,
    "url_file" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_kontrak" (
    "id" SERIAL NOT NULL,
    "tender_id" INTEGER NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "nomor_kontrak" TEXT NOT NULL,
    "file_kontrak" TEXT,
    "tanggal_kontrak" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_kontrak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_projects" (
    "id" SERIAL NOT NULL,
    "kontrak_id" INTEGER NOT NULL,
    "nama_project" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_shop_drawings" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_pekerjaan" TEXT NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_shop_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_material_approvals" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_material" TEXT NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_material_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_metode_pekerjaan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_metode" TEXT NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_metode_pekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_sertifikasi_pekerjaan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_sertifikasi_pekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_peralatan_list" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_peralatan_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_checklist_konstruksi" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_tahap" TEXT NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_checklist_konstruksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_inspeksi_area_pekerjaan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_inspeksi_area_pekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_inspeksi_peralatan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_inspeksi_peralatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_progress_harian" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_progress_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_progress_mingguan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "minggu_ke" INTEGER NOT NULL,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_progress_mingguan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_progress_bulanan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "bulan" TEXT NOT NULL,
    "file_url" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_progress_bulanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_tta" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "bulan" TEXT NOT NULL,
    "file_url" TEXT,
    "tanggal_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_tta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_kta" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "bulan" TEXT NOT NULL,
    "file_url" TEXT,
    "tanggal_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_kta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_ibpr" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_ibpr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_jsa" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "nama_pekerjaan" TEXT NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_jsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_sosialisasi_jsa" (
    "id" SERIAL NOT NULL,
    "jsa_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "tanggal" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_sosialisasi_jsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_meetings" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "tipe_link" "TipeLinkMeeting" NOT NULL,
    "ref_progress_id" INTEGER,
    "tanggal_meeting" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_dokumentasi_meeting" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "file_foto" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_dokumentasi_meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_mom" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "pica" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "pic" TEXT NOT NULL,
    "status_close" BOOLEAN NOT NULL DEFAULT false,
    "tgl_close" DATE,
    "hari_terlambat" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_mom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_dokumen_surat" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "tipe" "TipeDokumenSurat" NOT NULL,
    "file_url" TEXT,
    "tanggal" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eprom_dokumen_surat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_opname_pekerjaan" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "progress_persen" DECIMAL(5,2) NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_opname_pekerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_as_build_drawing" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_as_build_drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_komisioning" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_komisioning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_serah_terima" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_serah_terima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_masa_pemeliharaan_checklist" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_masa_pemeliharaan_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eprom_ba_serah_terima" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "file_url" TEXT,
    "status" "StatusApprovalEprom" NOT NULL DEFAULT 'PENDING',
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eprom_ba_serah_terima_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eprom_tender_undangan_tender_id_vendor_id_key" ON "eprom_tender_undangan"("tender_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "eprom_tender_sph_tender_id_vendor_id_round_ke_key" ON "eprom_tender_sph"("tender_id", "vendor_id", "round_ke");

-- CreateIndex
CREATE INDEX "eprom_document_folders_tender_id_idx" ON "eprom_document_folders"("tender_id");

-- CreateIndex
CREATE INDEX "eprom_document_folders_vendor_id_idx" ON "eprom_document_folders"("vendor_id");

-- CreateIndex
CREATE INDEX "eprom_document_folders_parent_folder_id_idx" ON "eprom_document_folders"("parent_folder_id");

-- CreateIndex
CREATE INDEX "eprom_file_uploads_folder_id_idx" ON "eprom_file_uploads"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "eprom_kontrak_tender_id_key" ON "eprom_kontrak"("tender_id");

-- CreateIndex
CREATE INDEX "eprom_shop_drawings_project_id_status_idx" ON "eprom_shop_drawings"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_material_approvals_project_id_status_idx" ON "eprom_material_approvals"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_metode_pekerjaan_project_id_status_idx" ON "eprom_metode_pekerjaan"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_sertifikasi_pekerjaan_project_id_status_idx" ON "eprom_sertifikasi_pekerjaan"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_peralatan_list_project_id_status_idx" ON "eprom_peralatan_list"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_checklist_konstruksi_project_id_status_idx" ON "eprom_checklist_konstruksi"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_inspeksi_area_pekerjaan_project_id_idx" ON "eprom_inspeksi_area_pekerjaan"("project_id");

-- CreateIndex
CREATE INDEX "eprom_inspeksi_peralatan_project_id_idx" ON "eprom_inspeksi_peralatan"("project_id");

-- CreateIndex
CREATE INDEX "eprom_progress_harian_project_id_tanggal_idx" ON "eprom_progress_harian"("project_id", "tanggal");

-- CreateIndex
CREATE INDEX "eprom_progress_mingguan_project_id_idx" ON "eprom_progress_mingguan"("project_id");

-- CreateIndex
CREATE INDEX "eprom_progress_bulanan_project_id_idx" ON "eprom_progress_bulanan"("project_id");

-- CreateIndex
CREATE INDEX "eprom_tta_project_id_bulan_idx" ON "eprom_tta"("project_id", "bulan");

-- CreateIndex
CREATE INDEX "eprom_kta_project_id_bulan_idx" ON "eprom_kta"("project_id", "bulan");

-- CreateIndex
CREATE INDEX "eprom_ibpr_project_id_status_idx" ON "eprom_ibpr"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_jsa_project_id_status_idx" ON "eprom_jsa"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "eprom_sosialisasi_jsa_jsa_id_key" ON "eprom_sosialisasi_jsa"("jsa_id");

-- CreateIndex
CREATE INDEX "eprom_meetings_project_id_idx" ON "eprom_meetings"("project_id");

-- CreateIndex
CREATE INDEX "eprom_dokumentasi_meeting_meeting_id_idx" ON "eprom_dokumentasi_meeting"("meeting_id");

-- CreateIndex
CREATE INDEX "eprom_mom_meeting_id_idx" ON "eprom_mom"("meeting_id");

-- CreateIndex
CREATE INDEX "eprom_dokumen_surat_project_id_tipe_idx" ON "eprom_dokumen_surat"("project_id", "tipe");

-- CreateIndex
CREATE INDEX "eprom_opname_pekerjaan_project_id_status_idx" ON "eprom_opname_pekerjaan"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_as_build_drawing_project_id_status_idx" ON "eprom_as_build_drawing"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_komisioning_project_id_status_idx" ON "eprom_komisioning"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_serah_terima_project_id_status_idx" ON "eprom_serah_terima"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_masa_pemeliharaan_checklist_project_id_status_idx" ON "eprom_masa_pemeliharaan_checklist"("project_id", "status");

-- CreateIndex
CREATE INDEX "eprom_ba_serah_terima_project_id_status_idx" ON "eprom_ba_serah_terima"("project_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_undangan" ADD CONSTRAINT "eprom_tender_undangan_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_undangan" ADD CONSTRAINT "eprom_tender_undangan_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_sph" ADD CONSTRAINT "eprom_tender_sph_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tender_sph" ADD CONSTRAINT "eprom_tender_sph_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_document_folders" ADD CONSTRAINT "eprom_document_folders_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_document_folders" ADD CONSTRAINT "eprom_document_folders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_document_folders" ADD CONSTRAINT "eprom_document_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "eprom_document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_file_uploads" ADD CONSTRAINT "eprom_file_uploads_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "eprom_document_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_file_uploads" ADD CONSTRAINT "eprom_file_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_kontrak" ADD CONSTRAINT "eprom_kontrak_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "eprom_tender_process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_kontrak" ADD CONSTRAINT "eprom_kontrak_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "eprom_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_projects" ADD CONSTRAINT "eprom_projects_kontrak_id_fkey" FOREIGN KEY ("kontrak_id") REFERENCES "eprom_kontrak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_shop_drawings" ADD CONSTRAINT "eprom_shop_drawings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_material_approvals" ADD CONSTRAINT "eprom_material_approvals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_metode_pekerjaan" ADD CONSTRAINT "eprom_metode_pekerjaan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_sertifikasi_pekerjaan" ADD CONSTRAINT "eprom_sertifikasi_pekerjaan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_peralatan_list" ADD CONSTRAINT "eprom_peralatan_list_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_checklist_konstruksi" ADD CONSTRAINT "eprom_checklist_konstruksi_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_inspeksi_area_pekerjaan" ADD CONSTRAINT "eprom_inspeksi_area_pekerjaan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_inspeksi_peralatan" ADD CONSTRAINT "eprom_inspeksi_peralatan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_progress_harian" ADD CONSTRAINT "eprom_progress_harian_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_progress_mingguan" ADD CONSTRAINT "eprom_progress_mingguan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_progress_bulanan" ADD CONSTRAINT "eprom_progress_bulanan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_tta" ADD CONSTRAINT "eprom_tta_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_kta" ADD CONSTRAINT "eprom_kta_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_ibpr" ADD CONSTRAINT "eprom_ibpr_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_jsa" ADD CONSTRAINT "eprom_jsa_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_sosialisasi_jsa" ADD CONSTRAINT "eprom_sosialisasi_jsa_jsa_id_fkey" FOREIGN KEY ("jsa_id") REFERENCES "eprom_jsa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_meetings" ADD CONSTRAINT "eprom_meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_dokumentasi_meeting" ADD CONSTRAINT "eprom_dokumentasi_meeting_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "eprom_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_mom" ADD CONSTRAINT "eprom_mom_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "eprom_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_dokumen_surat" ADD CONSTRAINT "eprom_dokumen_surat_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_opname_pekerjaan" ADD CONSTRAINT "eprom_opname_pekerjaan_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_as_build_drawing" ADD CONSTRAINT "eprom_as_build_drawing_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_komisioning" ADD CONSTRAINT "eprom_komisioning_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_serah_terima" ADD CONSTRAINT "eprom_serah_terima_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_masa_pemeliharaan_checklist" ADD CONSTRAINT "eprom_masa_pemeliharaan_checklist_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eprom_ba_serah_terima" ADD CONSTRAINT "eprom_ba_serah_terima_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "eprom_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
