-- DropForeignKey
ALTER TABLE "eprom_tender_undangan_file" DROP CONSTRAINT IF EXISTS "eprom_tender_undangan_file_undangan_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "eprom_tender_undangan_file";
