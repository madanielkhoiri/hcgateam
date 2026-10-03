-- AlterTable
ALTER TABLE "eprom_tender_sph" ADD COLUMN     "file_sph_files" TEXT[] DEFAULT ARRAY[]::TEXT[];
