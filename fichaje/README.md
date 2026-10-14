# TMB Fichaje ⏱
**Control horario de subcontratas (SSPT y UNICREW) — Technical Maritime Bureau SL**

Aplicación web (instalable en el móvil) para que los operarios de las subcontratas fichen
entrada y salida en las órdenes de trabajo (OT) de TMB, y para que TMB verifique las horas y
emita los time sheets de cliente y los resúmenes para las oficinas de las subcontratas.

Idiomas: **castellano, inglés, ruso y rumano**. Cada usuario tiene su idioma, que puede cambiar
desde la cabecera. Los informes se pueden generar en cualquiera de los cuatro idiomas.

---

## Funcionalidades

### Operario (móvil)
- Ve **solo las OT que tiene asignadas** y abiertas.
- **Fichar entrada** en una OT indicando si trabaja **a bordo o en taller**, y **fichar salida**,
  con observaciones opcionales y cronómetro. Si cambia de lugar, ficha salida y vuelve a fichar entrada.
- Consulta sus fichajes de los últimos 31 días y las horas de hoy y de la semana.
- Puede cambiar su contraseña.

### Administrador TMB
- **Operarios**: alta de usuarios (nombre, DNI/NIE/pasaporte, empresa SSPT/UNICREW, idioma,
  contraseña), edición, cambio de contraseña y baja. Al dar de baja a un operario se le retira de
  todas sus OT y se cierra su fichaje abierto.
- **Órdenes de trabajo**: alta de OT (nº, descripción, cliente, buque, ubicación), **asignación de
  operarios** (marcando al **capataz** de cada OT) y **retirada** cuando ya no son necesarios. Al retirar a un operario que está fichado
  en esa OT, su fichaje se cierra en ese momento. Al cerrar una OT se retira a todos sus operarios.
  Se conserva el historial de asignaciones.
- **Fichajes**: consulta con filtros (fechas, empresa, operario, OT, estado), **verificación** de
  horas por TMB (individual o en bloque), corrección de horas, alta de fichajes manuales y
  eliminación. Corregir horas u OT de un fichaje verificado lo devuelve a «pendiente».
- **Informes**:
  - **Time sheet de cliente** (formato oficial de TMB, en inglés, A4 apaisado): horas de una OT en
    un periodo por operario y día, separadas en **On board / Workshop** y en **Normal / Overtime /
    Holiday / Night**, redondeadas a la hora entera. Imprimible / guardable como PDF y exportable a CSV.
    Reglas de clasificación (por operario y día, sumando a bordo y taller):
    - *Holiday*: sábados, domingos y los **festivos** que TMB dé de alta en la pestaña Festivos.
    - *Night*: horas entre 22:00 y 06:00 en días laborables.
    - *Normal*: las 8 primeras horas del día; *Overtime*: el resto.

    Las reglas están en `public/hours.js` (`HOUR_RULES`).
  - **Resumen para subcontrata**: horas **verificadas por TMB** por operario y periodo, con detalle
    diario por OT. Avisa si quedan fichajes pendientes de verificar en el periodo.
- **Registro de cambios**: toda acción (fichajes, correcciones, asignaciones, altas y bajas) queda
  registrada con usuario y hora.

> El formato del resumen para subcontratas es provisional (`public/reports.js`) a la espera del
> formato oficial.

---

## Instalación

Requisitos: **Node.js 22.13 o superior** (usa la base de datos SQLite integrada en Node; no hay
que instalar ninguna base de datos).

```bash
cd fichaje
npm install
ADMIN_PASSWORD='una-contraseña-segura' npm start
```

La aplicación arranca en el puerto **3100**: `http://localhost:3100`.

En el primer arranque se crea el usuario administrador `admin`. Si no se indica `ADMIN_PASSWORD`,
se genera una contraseña aleatoria y se muestra en la consola.

| Variable         | Por defecto          | Uso                                      |
|------------------|----------------------|------------------------------------------|
| `PORT`           | `3100`               | Puerto HTTP                              |
| `DB_FILE`        | `data/fichaje.db`    | Fichero de la base de datos              |
| `ADMIN_USER`     | `admin`              | Usuario del primer administrador         |
| `ADMIN_PASSWORD` | (aleatoria)          | Contraseña del primer administrador      |

**Copias de seguridad**: `node backup.js` crea una copia consistente en `data/backups/`. El registro de jornada debe
conservarse 4 años (art. 34.9 del Estatuto de los Trabajadores).

---

## Publicar en un VPS (acceso desde cualquier móvil u ordenador)

Así queda accesible desde internet con HTTPS, por ejemplo en `https://fichaje.technicalmb.net`,
y los operarios pueden fichar desde cualquier móvil, tablet u ordenador con navegador (y
añadirla a la pantalla de inicio como una app).

Incluye: la aplicación en Docker, **Caddy** con certificado HTTPS gratuito y renovación
automática, reinicio automático si el servidor se reinicia y **copia de seguridad diaria**.

### 1. Contratar el VPS
Cualquier VPS con **Ubuntu 24.04** sirve (Hetzner CX22, DigitalOcean, OVH… ~4–6 €/mes; 1–2 GB de
RAM es suficiente). Apunta la **IP pública**.

### 2. Dominio (recomendado)
En el panel DNS de `technicalmb.net`, crea un registro **A**: `fichaje` → IP del VPS.
Si aún no hay dominio, el instalador puede usar `IP-DEL-VPS.sslip.io`, que también tiene HTTPS.

### 3. Instalar
Conéctate al VPS (`ssh root@IP-DEL-VPS`) y ejecuta:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/teo664/Tmb-inspect.git /opt/tmb
cd /opt/tmb/fichaje/deploy
sudo ./instalar.sh
```

El instalador pide el dominio y la contraseña del administrador, instala Docker, arranca la app
y programa la copia diaria. Al terminar muestra la dirección y las credenciales.

> La app debe estar en la rama `main` (PR fusionada) antes de clonar.
> Si el repositorio es privado, GitHub pedirá usuario y un *token* personal en el `git clone`.

### Mantenimiento

| Tarea | Comando (en `/opt/tmb/fichaje/deploy`) |
|---|---|
| Actualizar a la última versión (hace copia antes) | `sudo ./actualizar.sh` |
| Copia de seguridad inmediata | `sudo ./copia.sh` |
| Ver estado | `docker compose ps` |
| Ver registros | `docker compose logs -f app` |
| Reiniciar | `docker compose restart` |

- Datos: `deploy/data/fichaje.db`. Copias: `deploy/data/backups/` (se guardan 60 días).
  **Conviene descargar periódicamente las copias fuera del servidor** (o activar las copias
  automáticas del proveedor del VPS).
- Restaurar una copia: `docker compose stop app`, sustituir `data/fichaje.db` por la copia
  (borrando `fichaje.db-wal` y `fichaje.db-shm` si existen) y `docker compose start app`.
- La contraseña de `.env` solo se usa en el primer arranque; después se cambia desde la app.

## Tests

```bash
npm test
```
