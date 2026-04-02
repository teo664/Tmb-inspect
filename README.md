# TMB Inspect 🚢
**Aplicación de Inspección Naval — Technical Maritime Bureau SL**

Aplicación web progresiva (PWA) para técnicos de TMB. Permite realizar inspecciones a bordo de buques desde cualquier smartphone, con checklist detallado, captura de fotos, lista de materiales y generación automática de informe PDF.

---

## ✅ Funcionalidades

- **9 categorías de inspección, 65+ ítems** con respuestas SÍ / NO / N/A
- **Fotos** con la cámara del teléfono, con descripción por foto
- **Lista de materiales** con cantidad y unidad
- **Informe PDF profesional** generado al instante en el dispositivo
- **Compartir** directamente desde el teléfono (WhatsApp, email, etc.)
- **Instalable** como app nativa en Android e iOS
- **Funciona offline** — guarda borradores localmente

### Categorías del checklist:
1. Seguridad / Safety
2. Casco y Estructura / Hull & Structure
3. Cubierta / Deck
4. Maquinaria Principal / Main Machinery
5. Sistemas Auxiliares / Auxiliary Systems
6. Sistema Eléctrico / Electrical Systems
7. Sala de Máquinas / Engine Room
8. Equipos de Salvamento / Life-Saving Equipment
9. Habitabilidad / Accommodation

---

## 🚀 Instalación en el servidor

### Requisitos
- Node.js 18 o superior
- Acceso a la red local (o IP pública para acceso remoto)

### 1. Instalar dependencias

```bash
cd tmb-inspect
npm install
```

### 2. Iniciar el servidor

```bash
npm start
```

El servidor arranca en el puerto 3000. Verás:
```
✅ TMB Inspect corriendo en http://localhost:3000
   Acceso en red local: http://TU-IP-LOCAL:3000
```

### 3. Acceso desde los teléfonos

Conecta el teléfono a la misma red WiFi que el servidor y abre Chrome:
```
http://IP-DEL-SERVIDOR:3000
```

> **Para saber la IP del servidor en Mac:**
> ```bash
> ipconfig getifaddr en0
> ```
> En Windows: `ipconfig` → busca "Dirección IPv4"

### 4. Instalar como app en el teléfono

**Android (Chrome):**
→ Menú (⋮) → "Añadir a pantalla de inicio" → "Instalar"

**iOS (Safari):**
→ Botón compartir (□↑) → "Añadir a pantalla de inicio"

---

## 🌐 Acceso desde cualquier lugar (opcional)

Si los técnicos necesitan acceder desde fuera de la oficina (4G/5G), tienes dos opciones:

### Opción A: Cloudflare Tunnel (gratis, recomendado)
```bash
# Instala cloudflared
brew install cloudflare/cloudflare/cloudflared  # Mac
# O descarga desde https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

# Crea túnel (con la app corriendo en :3000)
cloudflared tunnel --url http://localhost:3000
```
Te dará una URL pública tipo `https://random-name.trycloudflare.com`

### Opción B: Servidor VPS
Sube el proyecto a cualquier VPS (DigitalOcean, Hetzner) y ejecuta:
```bash
npm install
npm start
```

---

## ⚙️ Cambiar el puerto

Por defecto usa el puerto 3000. Para cambiarlo:
```bash
PORT=8080 npm start
```

---

## 📄 Contenido del informe PDF

El PDF generado incluye:
- **Cabecera TMB** con datos del buque e inspector
- **Resultados del checklist** por categoría (Conforme / Deficiencia / N/A)
- **Resumen de deficiencias** destacadas
- **Fotografías** con descripción
- **Lista de materiales** en tabla
- **Notas del inspector**
- **Bloque de firma**
- **Pie de página** con datos de contacto de TMB

---

## 📞 Soporte

**Technical Maritime Bureau SL**  
Las Palmas de Gran Canaria, Islas Canarias  
info@technicalmb.net | teo@technicalmb.net  
Tel. +34 928 271 172 | +34 673 128 480
