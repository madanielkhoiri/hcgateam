CREATE TYPE "ToolOwner" AS ENUM ('GA', 'ELECTRIC');
CREATE TYPE "ToolAssetStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST');
CREATE TYPE "ToolReturnCondition" AS ENUM ('GOOD', 'DAMAGED', 'LOST');

CREATE TABLE "tool_borrow_employees" (
  "id" SERIAL NOT NULL,
  "nrp" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_borrow_employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_assets" (
  "id" SERIAL NOT NULL,
  "owner" "ToolOwner" NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ToolAssetStatus" NOT NULL DEFAULT 'AVAILABLE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_loans" (
  "id" SERIAL NOT NULL,
  "tool_id" INTEGER NOT NULL,
  "borrower_id" INTEGER NOT NULL,
  "borrowed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returned_at" TIMESTAMP(3),
  "returner_id" INTEGER,
  "return_condition" "ToolReturnCondition",
  "return_note" TEXT,
  "borrowed_by_user_id" INTEGER NOT NULL,
  "returned_by_user_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tool_loans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tool_borrow_employees_nrp_key" ON "tool_borrow_employees"("nrp");
CREATE INDEX "tool_borrow_employees_name_idx" ON "tool_borrow_employees"("name");
CREATE UNIQUE INDEX "tool_assets_owner_code_key" ON "tool_assets"("owner", "code");
CREATE INDEX "tool_assets_owner_status_idx" ON "tool_assets"("owner", "status");
CREATE INDEX "tool_assets_name_idx" ON "tool_assets"("name");
CREATE INDEX "tool_loans_tool_id_returned_at_idx" ON "tool_loans"("tool_id", "returned_at");
CREATE INDEX "tool_loans_borrower_id_borrowed_at_idx" ON "tool_loans"("borrower_id", "borrowed_at");
CREATE INDEX "tool_loans_borrowed_at_idx" ON "tool_loans"("borrowed_at");

ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tool_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "tool_borrow_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tool_loans" ADD CONSTRAINT "tool_loans_returner_id_fkey" FOREIGN KEY ("returner_id") REFERENCES "tool_borrow_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
