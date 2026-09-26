-- Ganti master Departemen menjadi departemen standar perusahaan:
-- HCGA, PLANT, PRODUKSI, SHE, ENGINEER, ICT MD, SCM - FAW.
-- Departemen lama dipetakan ke yang baru: karyawan, jadwal MCU, dan induksi
-- ulang ikut dipindah (tidak ada data transaksi yang dihapus, hanya baris
-- master lama yang sudah kosong). Aman dijalankan ulang (idempoten).

-- 1. Pastikan 7 departemen standar ada.
INSERT INTO "departemen" ("nama_departemen", "aktif", "created_at", "updated_at")
VALUES
  ('HCGA', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PLANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PRODUKSI', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SHE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ENGINEER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ICT MD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SCM - FAW', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nama_departemen") DO NOTHING;

-- 2. Pindahkan relasi dari departemen lama ke yang baru, lalu hapus baris lama.
DO $$
DECLARE
  pasangan TEXT[][] := ARRAY[
    ['Human Capital', 'HCGA'],
    ['General Affair', 'HCGA'],
    ['Civil Infrastructure', 'HCGA'],
    ['Administrasi', 'HCGA'],
    ['Finance & Accounting', 'SCM - FAW'],
    ['Produksi Tambang', 'PRODUKSI'],
    ['HSE & Safety', 'SHE'],
    ['IT & Sistem Informasi', 'ICT MD']
  ];
  i INT;
  id_lama INT;
  id_baru INT;
BEGIN
  FOR i IN 1..array_length(pasangan, 1) LOOP
    SELECT "id" INTO id_lama FROM "departemen" WHERE "nama_departemen" = pasangan[i][1];
    SELECT "id" INTO id_baru FROM "departemen" WHERE "nama_departemen" = pasangan[i][2];

    IF id_lama IS NOT NULL AND id_baru IS NOT NULL AND id_lama <> id_baru THEN
      UPDATE "karyawan" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;
      UPDATE "jadwal_mcu" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;
      UPDATE "induksi_ulang" SET "departemen_id" = id_baru WHERE "departemen_id" = id_lama;

      -- Akun admin departemen tidak boleh hilang saat baris lama dihapus.
      UPDATE "departemen"
      SET "admin_akun_id" = (SELECT "admin_akun_id" FROM "departemen" WHERE "id" = id_lama)
      WHERE "id" = id_baru AND "admin_akun_id" IS NULL;

      DELETE FROM "departemen" WHERE "id" = id_lama;
    END IF;
  END LOOP;
END $$;

-- 3. Samakan teks departemen di akun (Manajemen Akun) dengan nama baru.
UPDATE "users" SET "departemen" = 'HCGA'
WHERE "departemen" IN ('Human Capital', 'General Affair', 'Civil Infrastructure', 'Administrasi');
UPDATE "users" SET "departemen" = 'SCM - FAW' WHERE "departemen" = 'Finance & Accounting';
UPDATE "users" SET "departemen" = 'PRODUKSI' WHERE "departemen" = 'Produksi Tambang';
UPDATE "users" SET "departemen" = 'SHE' WHERE "departemen" = 'HSE & Safety';
UPDATE "users" SET "departemen" = 'ICT MD' WHERE "departemen" = 'IT & Sistem Informasi';
