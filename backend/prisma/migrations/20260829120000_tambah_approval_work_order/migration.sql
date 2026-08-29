-- CreateEnum
CREATE TYPE "StatusApprovalWorkOrder" AS ENUM ('MENUNGGU_GL', 'MENUNGGU_SH', 'MENUNGGU_PJO', 'DISETUJUI', 'DITOLAK');

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "status_approval" "StatusApprovalWorkOrder" NOT NULL DEFAULT 'MENUNGGU_GL',
ADD COLUMN     "disetujui_gl_oleh_id" INTEGER,
ADD COLUMN     "disetujui_gl_pada" TIMESTAMP(3),
ADD COLUMN     "disetujui_sh_oleh_id" INTEGER,
ADD COLUMN     "disetujui_sh_pada" TIMESTAMP(3),
ADD COLUMN     "disetujui_pjo_oleh_id" INTEGER,
ADD COLUMN     "disetujui_pjo_pada" TIMESTAMP(3),
ADD COLUMN     "alasan_tolak_approval" TEXT;

-- CreateIndex
CREATE INDEX "work_orders_status_approval_idx" ON "work_orders"("status_approval");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_disetujui_gl_oleh_id_fkey" FOREIGN KEY ("disetujui_gl_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_disetujui_sh_oleh_id_fkey" FOREIGN KEY ("disetujui_sh_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_disetujui_pjo_oleh_id_fkey" FOREIGN KEY ("disetujui_pjo_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
