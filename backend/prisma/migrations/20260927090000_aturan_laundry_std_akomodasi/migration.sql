-- Laundry hanya berlaku untuk perjalanan inklusif minimal 3 hari.
UPDATE "surat_tugas_karyawan" AS k
SET "laundry_nominal" = NULL,
    "laundry_keterangan" = NULL
FROM "surat_tugas_dinas" AS s
WHERE k."surat_tugas_id" = s."id"
  AND s."dengan_akomodasi" = true
  AND (s."tanggal_selesai" - s."tanggal_mulai" + 1) < 3;

UPDATE "surat_tugas_dinas" AS s
SET "laundry_nominal" = NULL,
    "laundry_keterangan" = NULL,
    "jumlah_akomodasi" = (
      SELECT COALESCE(
        SUM(
          COALESCE(k."uang_perjalanan_nominal", 0)
          + COALESCE(k."akomodasi_nominal", 0)
        ),
        0
      )
      FROM "surat_tugas_karyawan" AS k
      WHERE k."surat_tugas_id" = s."id"
    )
WHERE s."dengan_akomodasi" = true
  AND (s."tanggal_selesai" - s."tanggal_mulai" + 1) < 3;
