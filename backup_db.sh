#!/usr/bin/env bash
set -euo pipefail

DBS=("postgres" "postgresprime" "postgressecond")

PGHOST="0.0.0.0"
PGPORT="5432"
PGUSER="cryptoprocessingdb"

REMOTE_USER="root"
REMOTE_HOST="185.49.165.57"
REMOTE_DIR="/opt/db_backups"
PG_DUMP="/usr/lib/postgresql/17/bin/pg_dump"

TS=$(date +"%Y-%m-%d_%H-%M-%S")

for DB in "${DBS[@]}"; do
  OUT="backup_${DB}_${TS}.sql.gz"
  PGPASSWORD="${PGPASSWORD:-}" \
  "$PG_DUMP" -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$DB" \
    | gzip > "$OUT"

  rsync -azP "$OUT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
  echo "✅ done $DB"
done
