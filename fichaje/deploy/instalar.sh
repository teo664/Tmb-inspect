#!/usr/bin/env bash
# TMB Fichaje — instalación en un VPS Ubuntu/Debian. Ejecutar como root desde esta carpeta:
#   sudo ./instalar.sh
set -euo pipefail
cd "$(dirname "$0")"
DEPLOY_DIR="$(pwd)"

if [ "$(id -u)" -ne 0 ]; then echo "Ejecuta el script con sudo."; exit 1; fi

if ! command -v docker >/dev/null 2>&1; then
  echo "▶ Instalando Docker…"
  curl -fsSL https://get.docker.com | sh
fi

if [ ! -f .env ]; then
  PUBLIC_IP="$(curl -fsS https://api.ipify.org || true)"
  echo
  echo "Dominio de la aplicación (su DNS debe apuntar a esta IP: ${PUBLIC_IP:-desconocida})."
  read -rp "Deja vacío para usar ${PUBLIC_IP}.sslip.io: " DOMAIN
  DOMAIN="${DOMAIN:-${PUBLIC_IP}.sslip.io}"
  read -rsp "Contraseña del administrador (vacío = generar una): " ADMIN_PASSWORD; echo
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(head -c 12 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 14)}"
  umask 077
  cat > .env <<CONF
DOMAIN=${DOMAIN}
ADMIN_USER=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
CONF
  echo "▶ Configuración guardada en ${DEPLOY_DIR}/.env"
fi

mkdir -p data && chown 1000:1000 data

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp && ufw allow 443/tcp
fi

echo "▶ Construyendo y arrancando…"
docker compose up -d --build

CRON_FILE=/etc/cron.d/tmb-fichaje-backup
cat > "$CRON_FILE" <<CRON
# Copia diaria de la base de datos de TMB Fichaje (se conservan 60 días)
15 3 * * * root cd ${DEPLOY_DIR} && docker compose exec -T app node backup.js /app/data/backups 60 >> ${DEPLOY_DIR}/data/backup.log 2>&1
CRON
chmod 644 "$CRON_FILE"

source .env
echo
echo "✅ TMB Fichaje publicado en: https://${DOMAIN}"
echo "   Usuario: ${ADMIN_USER}   Contraseña: ${ADMIN_PASSWORD}"
echo "   (el certificado HTTPS puede tardar un minuto en emitirse la primera vez)"
echo "   Copias de seguridad diarias en: ${DEPLOY_DIR}/data/backups"
