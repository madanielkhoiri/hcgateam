-- Ganti alur persetujuan Surat Tugas Dinas: dari "pilih 1 penyetuju saat
-- buat surat" menjadi 2 tahap berurutan (SH lalu PJO), tanpa perlu
-- memilih akun penyetuju saat pembuatan surat. Tabel masih kosong,
-- aman untuk migrasi tipe kolom secara langsung.

-- Ganti isi enum status.
CREATE TYPE "StatusSuratTugas_new" AS ENUM ('MENUNGGU_SH', 'MENUNGGU_PJO', 'DISETUJUI', 'DITOLAK');
ALTER TABLE "surat_tugas_dinas" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "surat_tugas_dinas" ALTER COLUMN "status" TYPE "StatusSuratTugas_new" USING ("status"::text::"StatusSuratTugas_new");
DROP TYPE "StatusSuratTugas";
ALTER TYPE "StatusSuratTugas_new" RENAME TO "StatusSuratTugas";
ALTER TABLE "surat_tugas_dinas" ALTER COLUMN "status" SET DEFAULT 'MENUNGGU_SH';

-- Pecah kolom penyetuju tunggal menjadi 2 tahap (SH & PJO).
ALTER TABLE "surat_tugas_dinas" DROP CONSTRAINT "surat_tugas_dinas_disetujui_oleh_id_fkey";
DROP INDEX IF EXISTS "surat_tugas_dinas_disetujui_oleh_id_idx";
ALTER TABLE "surat_tugas_dinas" DROP COLUMN "disetujui_oleh_id";
ALTER TABLE "surat_tugas_dinas" DROP COLUMN "disetujui_pada";

ALTER TABLE "surat_tugas_dinas" ADD COLUMN "disetujui_sh_oleh_id" INTEGER;
ALTER TABLE "surat_tugas_dinas" ADD COLUMN "disetujui_sh_pada" TIMESTAMP(3);
ALTER TABLE "surat_tugas_dinas" ADD COLUMN "disetujui_pjo_oleh_id" INTEGER;
ALTER TABLE "surat_tugas_dinas" ADD COLUMN "disetujui_pjo_pada" TIMESTAMP(3);

ALTER TABLE "surat_tugas_dinas" ADD CONSTRAINT "surat_tugas_dinas_disetujui_sh_oleh_id_fkey" FOREIGN KEY ("disetujui_sh_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "surat_tugas_dinas" ADD CONSTRAINT "surat_tugas_dinas_disetujui_pjo_oleh_id_fkey" FOREIGN KEY ("disetujui_pjo_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;