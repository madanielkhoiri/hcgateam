#!/usr/bin/env bash
# ==================================================
# FILE: backend/scripts/restore-db.sh
# FUNGSI: Restore database dari file backup hasil backup-db.sh.
# PAKAI: ./restore-db.sh /var/backups/hcgateam/hcgateam_2026-08-30_020000.sql.gz
#
# PERINGATAN: Ini akan MENIMPA seluruh isi database tujuan.
# Selalu konfirmasi manual sebelum jalan di server production.
# ==================================================

set -euo pipefail

FILE_BACKUP="${1:?Isi path file backup, contoh: ./restore-db.sh /var/backups/hcgateam/hcgateam_2026-08-30_020000.sql.gz}"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$(dirname "$0")/../.env" ]; then
  export "$(grep -E '^DATABASE_URL=' "$(dirname "$0")/../.env" | xargs)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL tidak ditemukan — set manual atau pastikan backend/.env ada." >&2
  exit 1
fi

if [ ! -f "$FILE_BACKUP" ]; then
  echo "File backup tidak ditemukan: $FILE_BACKUP" >&2
  exit 1
fi

echo "PERINGATAN: ini akan MENIMPA seluruh data di database tujuan."
read -r -p "Ketik 'YAKIN' untuk lanjut: " KONFIRMASI
if [ "$KONFIRMASI" != "YAKIN" ]; then
  echo "Dibatalkan."
  exit 1
fi

echo "[$(date)] Restore dari $FILE_BACKUP ..."
gunzip -c "$FILE_BACKUP" | psql "$DATABASE_URL"
echo "[$(date)] Restore selesai."
