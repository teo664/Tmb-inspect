# TMB Fichaje — estado del proyecto

Última actualización: 15-10-2026.

## Hecho (en `main`)
- **Aplicación base:** alta de operarios (SSPT / UNICREW), órdenes de trabajo, asignación y retirada de operarios, fichaje de entrada y salida con «A bordo / Taller», verificación de horas por TMB, festivos y registro de cambios. En 4 idiomas: ES, EN, RU y RO.
- **Time sheet de cliente** con el formato oficial de TMB (`WO_2362.1`): On board / Workshop × Normal / Overtime / Holiday / Night, redondeado a horas enteras y con capataz por OT.
- **Hojas mensuales para las subcontratas** con sus formatos oficiales: SSPT «Time Sheet» y UNICREW «Attendance Timesheet». Solo incluyen fichajes verificados.
- **Publicación en VPS** con Docker + Caddy (HTTPS): `deploy/instalar.sh`, `actualizar.sh` y `copia.sh`.
- **Inicio de sesión con idioma y «📱 Móvil» / «🖥️ Pantalla grande»** (PR #5). La pantalla grande no guarda la sesión y la cierra sola al fichar o tras 60 s sin actividad (5 min si es un administrador). Sustituye al terminal con lista de nombres + PIN de la PR #4.

## En producción
- **Web:** https://tmbfichaje.com (dominio comprado en GoDaddy; registro A `@` → `2.29.106.188`, `www` es un CNAME al dominio).
- **Servidor:** VPS de Hetzner «tmb-fichaje», IP `2.29.106.188`. El repositorio está en `/opt/tmb` y la instalación en `/opt/tmb/fichaje/deploy` (el dominio se configura en su `.env`).
- **Actualizar tras un cambio en `main`:** `ssh root@2.29.106.188`, luego `cd /opt/tmb/fichaje/deploy && ./actualizar.sh`.

## Pendiente
- Cambiar la contraseña del administrador si aún no se ha hecho (Operarios → Editar).
- Dar de alta los festivos: 8 y 25 de diciembre de 2026, los locales de Las Palmas y el calendario 2027 del BOC.
- Dar de alta los operarios con su categoría (rank), documento y empresa.
- Crear las OT con IMO y bandera, asignar operarios y marcar el capataz.
- Hacer un fichaje real de prueba en el móvil y en un ordenador táctil.

## Decisiones tomadas (confirmar si cambian)
- **Normal / Overtime:** las 8 primeras horas del día son Normal y el resto Overtime.
- **Holiday:** sábados, domingos y festivos dados de alta. **Night:** de 22:00 a 06:00.
- **Redondeo:** a la hora entera en el time sheet y en las hojas de las subcontratas.
- **SSPT:** la columna «Travel, Days» queda vacía y la «Delivery Address» es siempre «LAS PALMAS, SP».

## Trabajar en local (Mac mini)
```bash
git clone https://github.com/teo664/Tmb-inspect.git
cd Tmb-inspect/fichaje
npm install
ADMIN_PASSWORD='admin123' npm start          # http://localhost:3100
npm test                                     # 11 tests
```
Requiere Node.js 22.13 o superior (`brew install node`).
