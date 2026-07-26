-- AlterTable
ALTER TABLE "stock_outs" ADD COLUMN     "description" TEXT,
ADD COLUMN     "photo_path" TEXT,
ALTER COLUMN "department" DROP NOT NULL;
