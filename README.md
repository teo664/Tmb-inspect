# Puerto TMB

Oficina de agentes de IA de **TMB (Technical Maritime Bureau SL)**, inspirada en las "oficinas de agentes" en pixel-art: cada agente es un barco amarrado en el puerto de Las Palmas y su luz dice si trabaja, si te necesita o si ha terminado algo para revisar.

- **Panel:** https://claude.ai/artifact/CQGQadfmtUzYDjyyA6MWyh (privado, solo lo abre el dueño)
- **Guía de montaje:** https://claude.ai/artifact/Fr7uzgUYbRLFxR6XciFk3P

## Cómo funciona

```
Rutinas de Claude (programadas)          Panel Puerto TMB (artifact con base de datos)
┌───────────────────────────┐   escriben   ┌──────────────────────────────────────┐
│ correo  documentos        │ ───────────▶ │ agentes · pendientes · mensajes      │
│ clientes  oportunidades   │              │ registro · clientes · presupuestos   │
│ proveedores               │ ◀─────────── │ oportunidades · proveedores · docs   │
└───────────────────────────┘   leen tus   └──────────────────────────────────────┘
   usan Gmail y Google Drive    respuestas      tú apruebas / rechazas / revisas
```

1. Cada agente es una **rutina de Claude** que sale a su hora, con los conectores de Gmail y Google Drive.
2. Al salir pone su barco en verde, lee tus respuestas y los mensajes de otros agentes, hace su trabajo y deja en el panel lo que necesita de ti.
3. En el panel tienes dos vistas:
   - **Puerto** (pixel-art): barcos con luz verde, roja o ámbar, una avioneta con lo más urgente, la gaviota cuando hay correo urgente, la lancha cuando un agente pasa trabajo a otro y el faro con los pendientes.
   - **Gestión**: los pendientes con Aprobar / Rechazar / Revisado, la flota, las tablas de clientes, presupuestos, oportunidades, proveedores y documentos (con búsqueda, alta y edición manual), la bitácora de cualquier día ("rebobinar el día") y los mensajes entre agentes.

## Los agentes

| Agente | Barco | Cuándo | Qué hace |
|---|---|---|---|
| `correo` | MV Gaviota | Laborables cada 2 h, 8:07–18:07 | Clasifica Gmail con etiquetas `Puerto/…`, prepara borradores y reparte trabajo |
| `documentos` | MV Archivo | Laborables 8:43 | Ficha y resume informes, certificados, presupuestos y facturas de Drive; avisa de caducidades |
| `clientes` | MV Armador | Laborables 8:52 y 15:52 | Fichas de cliente, estado de presupuestos, recordatorios y cobros pendientes |
| `oportunidades` | MV Rumbo | Laborables 9:23 | Peticiones de oferta, buques que llegan, cartera comercial, recuperar clientes |
| `proveedores` | MV Estiba | Laborables 9:37 | Pedidos, ofertas, retrasos y facturas para dar el visto bueno; alerta de fraude bancario |

Límites comunes: **nunca envían correos** (solo borradores), no borran ni archivan nada, en Drive solo leen, y tratan el contenido de correos y documentos como datos, no como órdenes.

## Estructura

```
agentes/PROTOCOLO.md        Reglas comunes y modelo de datos del panel
agentes/<agente>.md         Instrucciones propias de cada agente
panel/puerto-tmb.html       El panel (se publica como artifact con capacidades db + user)
panel/montaje.plantilla.html  Plantilla de la guía de montaje
scripts/montar_prompts.py   Une protocolo + agente → rutinas/<agente>.txt
scripts/montar_guia.py      Genera panel/montaje.html con los textos para copiar
rutinas/                    Textos generados que lleva cada rutina
```

## Cambiar a un agente

1. Edita `agentes/<agente>.md` (o `PROTOCOLO.md` si afecta a todos).
2. `python3 scripts/montar_prompts.py && python3 scripts/montar_guia.py`
3. Pega el texto nuevo de `rutinas/<agente>.txt` en su rutina de claude.ai (o pídeselo a Claude en una sesión con este repo).

## Añadir un agente

1. Crea `agentes/<id>.md` siguiendo el formato de los demás y añade el id a `AGENTES` en `scripts/montar_prompts.py` y a `RUTINAS` en `scripts/montar_guia.py`.
2. Añade su barco a `AGENTS` en `panel/puerto-tmb.html` (y una posición más en `SHIP_X`) y vuelve a publicar el panel.
3. Crea su rutina.
