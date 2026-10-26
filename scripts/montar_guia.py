"""Genera panel/montaje.html: la guía para crear las rutinas en claude.ai,
con el texto de cada agente listo para copiar."""
import html, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from montar_prompts import RAIZ, AGENTES, montar

RUTINAS = {
    "correo":        ("Puerto TMB · Correo",        "CRON_TZ=Atlantic/Canary 7 8-18/2 * * 1-5", "Laborables cada 2 horas, de 8:07 a 18:07", "Ya creada y en pausa. Edítala: añade los conectores, sustituye su texto por este (es la versión corregida) y actívala."),
    "documentos":    ("Puerto TMB · Documentos",    "CRON_TZ=Atlantic/Canary 43 8 * * 1-5",     "Laborables a las 8:43", ""),
    "clientes":      ("Puerto TMB · Clientes",      "CRON_TZ=Atlantic/Canary 52 8,15 * * 1-5",  "Laborables a las 8:52 y a las 15:52", ""),
    "oportunidades": ("Puerto TMB · Oportunidades", "CRON_TZ=Atlantic/Canary 23 9 * * 1-5",     "Laborables a las 9:23", ""),
    "proveedores":   ("Puerto TMB · Proveedores",   "CRON_TZ=Atlantic/Canary 37 9 * * 1-5",     "Laborables a las 9:37", ""),
}

def tarjeta(i, a):
    nombre, cron, cuando, nota = RUTINAS[a]
    texto = html.escape(montar(a))
    extra = f'<p class="note">{html.escape(nota)}</p>' if nota else ""
    return f"""
<section class="card" id="{a}">
  <header><span class="n">{i}</span><h2>{html.escape(nombre)}</h2></header>
  {extra}
  <dl>
    <dt>Nombre</dt><dd><code>{html.escape(nombre)}</code></dd>
    <dt>Cuándo</dt><dd>{html.escape(cuando)} (hora de Canarias)</dd>
    <dt>Horario (cron)</dt><dd><code>{html.escape(cron)}</code></dd>
    <dt>Conectores</dt><dd>Gmail y Google Drive</dd>
    <dt>Sesión</dt><dd>Nueva en cada salida</dd>
  </dl>
  <div class="row"><button type="button" class="copy" data-target="t-{a}">Copiar instrucciones</button><span class="size">{len(montar(a)):,} caracteres</span></div>
  <details><summary>Ver el texto</summary><pre id="t-{a}">{texto}</pre></details>
</section>"""

def main():
    tarjetas = "".join(tarjeta(i + 1, a) for i, a in enumerate(AGENTES))
    plantilla = (RAIZ / "panel" / "montaje.plantilla.html").read_text()
    (RAIZ / "panel" / "montaje.html").write_text(plantilla.replace("<!--TARJETAS-->", tarjetas))
    print("panel/montaje.html")

if __name__ == "__main__":
    main()
