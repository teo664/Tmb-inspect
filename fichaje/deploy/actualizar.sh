#!/usr/bin/env bash
# TMB Fichaje — actualiza a la última versión del repositorio sin perder datos.
set -euo pipefail
cd "$(dirname "$0")"
docker compose exec -T app node backup.js /app/data/backups 60
git pull --ff-only
docker compose up -d --build
# Caddy no relee el Caddyfile por sí solo: se reinicia para aplicar cambios en él.
docker compose restart caddy
docker image prune -f >/dev/null
echo "✅ Actualizado."
