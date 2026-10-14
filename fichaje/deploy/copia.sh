#!/usr/bin/env bash
# TMB Fichaje — copia de seguridad manual inmediata.
set -euo pipefail
cd "$(dirname "$0")"
docker compose exec -T app node backup.js /app/data/backups 60
