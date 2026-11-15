ALTER TABLE "tool_assets" ADD COLUMN "inspection_type" TEXT;
ALTER TABLE "tool_loans" ADD COLUMN "borrow_method" TEXT;
ALTER TABLE "tool_loans" ADD COLUMN "return_method" TEXT;
ALTER TABLE "tool_loans" ADD COLUMN "borrow_inspection" JSONB;
