#!/bin/sh
set -eu

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="/backups"
mkdir -p "$BACKUP_DIR"

OUT_FILE="$BACKUP_DIR/nilas_treat_${TIMESTAMP}.sql.gz"
pg_dump --no-owner --no-acl | gzip -9 > "$OUT_FILE"

# Retain last 14 daily backups
find "$BACKUP_DIR" -name "nilas_treat_*.sql.gz" -type f -mtime +14 -delete
echo "[Backup] Completed $OUT_FILE"
