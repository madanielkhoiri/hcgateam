UPDATE "surat_tugas_karyawan" AS karyawan
SET "frekuensi_makan" =
  ((surat."tanggal_selesai"::date - surat."tanggal_mulai"::date) + 1) * 3
FROM "surat_tugas_dinas" AS surat
WHERE karyawan."surat_tugas_id" = surat."id"
  AND surat."dengan_akomodasi" = TRUE;
