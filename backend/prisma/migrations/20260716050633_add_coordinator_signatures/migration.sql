-- CreateTable
CREATE TABLE "coordinator_signatures" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordinator_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coordinator_signatures_name_idx" ON "coordinator_signatures"("name");
