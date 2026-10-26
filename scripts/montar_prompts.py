"""Une el protocolo común con las instrucciones de cada agente y deja en
rutinas/<agente>.txt el texto que lleva cada rutina programada de Claude."""
import pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PANEL_URL = "https://claude.ai/artifact/CQGQadfmtUzYDjyyA6MWyh"
AGENTES = ["correo", "documentos", "clientes", "oportunidades", "proveedores"]

def montar(agente: str) -> str:
    protocolo = (RAIZ / "agentes" / "PROTOCOLO.md").read_text().replace("{{PANEL_URL}}", PANEL_URL)
    propio = (RAIZ / "agentes" / f"{agente}.md").read_text()
    cabecera = (
        f"Eres el agente `{agente}` de Puerto TMB. Haz ahora una salida completa siguiendo "
        f"el protocolo común y tus instrucciones. Donde el protocolo dice <tu-id>, tu id es `{agente}`. "
        "No hagas preguntas: nadie va a contestar en esta sesión. Si te falta algo, déjalo como "
        "pendiente en el panel. No toques ningún repositorio de código: ni cambios, ni commits, ni ramas.\n\n"
    )
    return cabecera + protocolo + "\n\n---\n\n" + propio

if __name__ == "__main__":
    salida = RAIZ / "rutinas"
    salida.mkdir(exist_ok=True)
    for a in (sys.argv[1:] or AGENTES):
        (salida / f"{a}.txt").write_text(montar(a))
        print("rutinas/%s.txt" % a)
