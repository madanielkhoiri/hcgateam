-- AlterTable
ALTER TABLE "eprom_engineer_document_approvals" ADD COLUMN     "ada_tanda_tangan" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "signature_file" DROP NOT NULL,
ALTER COLUMN "signature_page" DROP NOT NULL,
ALTER COLUMN "signature_x_ratio" DROP NOT NULL,
ALTER COLUMN "signature_y_ratio" DROP NOT NULL,
ALTER COLUMN "signature_width_ratio" DROP NOT NULL,
ALTER COLUMN "signature_height_ratio" DROP NOT NULL;
