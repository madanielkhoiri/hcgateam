-- AlterTable
ALTER TABLE "civil_laporan_tps3r" ADD COLUMN     "organik_makanan" DOUBLE PRECISION,
ADD COLUMN     "organik_taman" DOUBLE PRECISION,
ADD COLUMN     "recycle_kaca" DOUBLE PRECISION,
ADD COLUMN     "recycle_kertas" DOUBLE PRECISION,
ADD COLUMN     "recycle_logam" DOUBLE PRECISION,
ADD COLUMN     "recycle_pallet" DOUBLE PRECISION,
ADD COLUMN     "recycle_plastik_keras" DOUBLE PRECISION,
ADD COLUMN     "reuse_kertas" DOUBLE PRECISION,
ADD COLUMN     "reuse_lainnya" DOUBLE PRECISION,
ADD COLUMN     "reuse_plastik" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "civil_sampah_terkelola_tps3r" ADD COLUMN     "tangani_bank_sampah" DOUBLE PRECISION,
ADD COLUMN     "tangani_biopori" DOUBLE PRECISION,
ADD COLUMN     "tangani_kompos" DOUBLE PRECISION,
ADD COLUMN     "tangani_maggot" DOUBLE PRECISION,
ADD COLUMN     "tangani_tps_maju_bersama" DOUBLE PRECISION,
ADD COLUMN     "tangani_tps_menanti" DOUBLE PRECISION,
ADD COLUMN     "tangani_tps_navaraha" DOUBLE PRECISION;

