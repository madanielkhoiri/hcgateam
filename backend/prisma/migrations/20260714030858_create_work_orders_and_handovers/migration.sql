-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'ON_PROGRESS', 'CLOSE');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('P1', 'P2');

-- CreateEnum
CREATE TYPE "WorkOrderPic" AS ENUM ('GA_INFRAS', 'GA_ELECTRIC');

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "work_order_number" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "work_order_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT,
    "pic" "WorkOrderPic" NOT NULL DEFAULT 'GA_INFRAS',
    "job_type" TEXT NOT NULL,
    "user_department_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "requested_at" DATE NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'P2',
    "closed_at" TIMESTAMP(3),
    "closed_duration_days" INTEGER,
    "image_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handovers" (
    "id" SERIAL NOT NULL,
    "stp_number" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "work_order_id" INTEGER NOT NULL,
    "handover_date" DATE NOT NULL,
    "receiver_name" TEXT,
    "receiver_position" TEXT,
    "receiver_department" TEXT,
    "location" TEXT,
    "handover_note" TEXT,
    "documentation_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "auto_created" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_work_order_number_key" ON "work_orders"("work_order_number");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_sequence_number_key" ON "work_orders"("sequence_number");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_requested_at_idx" ON "work_orders"("requested_at");

-- CreateIndex
CREATE INDEX "work_orders_department_idx" ON "work_orders"("department");

-- CreateIndex
CREATE INDEX "work_orders_pic_idx" ON "work_orders"("pic");

-- CreateIndex
CREATE UNIQUE INDEX "handovers_stp_number_key" ON "handovers"("stp_number");

-- CreateIndex
CREATE UNIQUE INDEX "handovers_sequence_number_key" ON "handovers"("sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "handovers_work_order_id_key" ON "handovers"("work_order_id");

-- CreateIndex
CREATE INDEX "handovers_handover_date_idx" ON "handovers"("handover_date");

-- CreateIndex
CREATE INDEX "handovers_receiver_department_idx" ON "handovers"("receiver_department");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
