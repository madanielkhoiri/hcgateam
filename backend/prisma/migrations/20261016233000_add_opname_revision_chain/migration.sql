ALTER TABLE "eprom_opname_pekerjaan"
ADD COLUMN "revision_root_id" INTEGER;

CREATE INDEX "eprom_opname_pekerjaan_revision_root_id_idx"
ON "eprom_opname_pekerjaan"("revision_root_id");

ALTER TABLE "eprom_opname_pekerjaan"
ADD CONSTRAINT "eprom_opname_pekerjaan_revision_root_id_fkey"
FOREIGN KEY ("revision_root_id") REFERENCES "eprom_opname_pekerjaan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
