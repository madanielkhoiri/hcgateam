DO $$
DECLARE
  id_lama INTEGER;
  id_baru INTEGER;
BEGIN
  SELECT "id" INTO id_lama FROM "departemen" WHERE "nama_departemen" = 'ENGINEER';
  SELECT "id" INTO id_baru FROM "departemen" WHERE "nama_departemen" = 'ENGINEERING';

  IF id_lama IS NOT NULL AND id_baru IS NULL THEN
    UPDATE "departemen"
    SET "nama_departemen" = 'ENGINEERING', "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = id_lama;
  ELSIF id_lama IS NOT NULL AND id_baru IS NOT NULL THEN
    UPDATE "karyawan" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;
    UPDATE "jadwal_mcu" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;
    UPDATE "induksi_ulang" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;
    UPDATE "departemen" tujuan
    SET "admin_akun_id" = sumber."admin_akun_id", "updated_at" = CURRENT_TIMESTAMP
    FROM "departemen" sumber
    WHERE tujuan."id" = id_baru
      AND sumber."id" = id_lama
      AND tujuan."admin_akun_id" IS NULL;
    DELETE FROM "departemen" WHERE "id" = id_lama;
  END IF;

  UPDATE "users" SET "departemen" = 'ENGINEERING' WHERE UPPER("departemen") = 'ENGINEER';
END $$;
