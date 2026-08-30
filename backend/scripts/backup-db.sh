#!/usr/bin/env bash
# ==================================================
# FILE: backend/scripts/backup-db.sh
# FUNGSI: Backup database PostgreSQL harian + rotasi otomatis.
# PAKAI DI: VPS production (mis. Hostinger), lewat cron.
#
# Setup sekali di VPS:
#   1. Salin .env.production (berisi DATABASE_URL) di server, atau isi
#      langsung variabel di bawah.
#   2. chmod +x backend/scripts/backup-db.sh
#   3. Tambah ke crontab (jalan tiap hari jam 2 pagi):
#        crontab -e
#        0 2 * * * /path/ke/backend/scripts/backup-db.sh >> /var/log/hcgateam-backup.log 2>&1
# ==================================================

set -euo pipefail

# Baca DATABASE_URL dari .env backend kalau belum di-set lewat environment.
if [ -z "${DATABASE_URL:-}" ] && [ -f "$(dirname "$0")/../.env" ]; then
  export "$(grep -E '^DATABASE_URL=' "$(dirname "$0")/../.env" | xargs)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL tidak ditemukan — set manual atau pastikan backend/.env ada." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hcgateam}"
RETENSI_HARI="${RETENSI_HARI:-14}"
TANGGAL="$(date +%Y-%m-%d_%H%M%S)"
FILE_TUJUAN="$BACKUP_DIR/hcgateam_$TANGGAL.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Mulai backup ke $FILE_TUJUAN"
pg_dump "$DATABASE_URL" | gzip > "$FILE_TUJUAN"
echo "[$(date)] Backup selesai: $(du -h "$FILE_TUJUAN" | cut -f1)"

# Hapus backup yang lebih tua dari RETENSI_HARI.
find "$BACKUP_DIR" -name 'hcgateam_*.sql.gz' -mtime "+$RETENSI_HARI" -delete
echo "[$(date)] Rotasi selesai — backup lebih tua dari $RETENSI_HARI hari dihapus."
