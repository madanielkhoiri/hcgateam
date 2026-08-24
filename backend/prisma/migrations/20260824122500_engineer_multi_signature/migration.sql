-- Simpan seluruh penempatan tanda tangan lintas halaman untuk audit approval.
ALTER TABLE "eprom_engineer_document_approvals"
  ADD COLUMN "signature_placements" JSONB;
