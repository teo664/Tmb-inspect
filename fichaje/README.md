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
- **Fichar entrada** en una OT y **fichar salida**, con observaciones opcionales y cronómetro.
- Consulta sus fichajes de los últimos 31 días y las horas de hoy y de la semana.
- Puede cambiar su contraseña.

### Administrador TMB
- **Operarios**: alta de usuarios (nombre, DNI/NIE/pasaporte, empresa SSPT/UNICREW, idioma,
  contraseña), edición, cambio de contraseña y baja. Al dar de baja a un operario se le retira de
  todas sus OT y se cierra su fichaje abierto.
- **Órdenes de trabajo**: alta de OT (nº, descripción, cliente, buque, ubicación), **asignación de
  operarios** y **retirada** cuando ya no son necesarios. Al retirar a un operario que está fichado
  en esa OT, su fichaje se cierra en ese momento. Al cerrar una OT se retira a todos sus operarios.
  Se conserva el historial de asignaciones.
- **Fichajes**: consulta con filtros (fechas, empresa, operario, OT, estado), **verificación** de
  horas por TMB (individual o en bloque), corrección de horas, alta de fichajes manuales y
  eliminación. Corregir horas u OT de un fichaje verificado lo devuelve a «pendiente».
- **Informes**:
  - **Time sheet de cliente**: horas de una OT en un periodo, por día y operario, con totales y
    espacio para la firma de TMB y del cliente. Imprimible / guardable como PDF y exportable a CSV.
  - **Resumen para subcontrata**: horas **verificadas por TMB** por operario y periodo, con detalle
    diario por OT. Avisa si quedan fichajes pendientes de verificar en el periodo.
- **Registro de cambios**: toda acción (fichajes, correcciones, asignaciones, altas y bajas) queda
  registrada con usuario y hora.

> Los formatos de time sheet y resumen son provisionales (`public/reports.js`) y se sustituirán por
> los formatos oficiales del cliente y de las subcontratas.

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

**Copias de seguridad**: basta con copiar la carpeta `data/`. El registro de jornada debe
conservarse 4 años (art. 34.9 del Estatuto de los Trabajadores).

Para usarla fuera de la red local, publicar con HTTPS (Cloudflare Tunnel o un VPS, igual que
TMB Inspect).

## Tests

```bash
npm test
```
