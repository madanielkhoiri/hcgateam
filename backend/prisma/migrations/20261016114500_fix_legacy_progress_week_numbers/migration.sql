-- Data lama menuliskan periode pada nama laporan, tetapi minggu_ke pernah
-- dihitung dari tanggal kontrak sehingga seluruh baris menjadi Week 40/41.
UPDATE "eprom_progress_mingguan"
SET "minggu_ke" = ((regexp_match("nama_pekerjaan", '^\s*LAPORAN\s+WEEK\s+([0-9]+)\s*$', 'i'))[1])::integer
WHERE "nama_pekerjaan" ~* '^\s*LAPORAN\s+WEEK\s+[0-9]+\s*$';
