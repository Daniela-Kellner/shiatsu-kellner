"""Local-only password setup; writes a verifier, never the password itself.

Run manually, then let Daniela complete the browser form herself. The output
file is deliberately outside website/ and must never be committed. Upload it
only to website/statistik/privat/zugang.php on her own hosting after tests pass.
"""

import hashlib
import hmac
import html
import os
from pathlib import Path
import secrets
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs

PORT = 8779
ORIGIN = f"http://127.0.0.1:{PORT}"
OUTPUT = Path(__file__).resolve().parents[1] / "tmp/statistik-zugang/zugang.php"
TOKEN = secrets.token_urlsafe(32)
SCRIPT_NONCE = secrets.token_urlsafe(24)


def render(done=False, error=""):
    body = (
        '<h1>Dein Statistik-Zugang ist vorbereitet.</h1>'
        '<p>Dein Passwort wurde nicht im Klartext gespeichert. Die geschützte '
        'Prüfdatei bleibt vorerst auf deinem Computer.</p>'
        '<p>Gib im Chat kurz Bescheid, dass du fertig bist. Danach können wir '
        'die Übersicht auf deinem eigenen Webspace fertig einrichten.</p>'
        if done else
        '<p class="eyebrow">Daniela Kellner · Website-Statistik</p>'
        '<h1>Dein persönlicher Zugang</h1>'
        '<p>Wähle ein eigenes Passwort für deine Besucherübersicht. '
        'Dieser Einrichtungsschritt läuft nur auf deinem Computer.</p>'
        '<p>Dein Benutzername ist <strong>Daniela</strong>.</p>'
        f'<p role="alert">{html.escape(error)}</p>'
        '<form method="post" action="/speichern">'
        f'<input type="hidden" name="token" value="{TOKEN}">'
        '<label>Neues Statistik-Passwort'
        '<input type="password" id="password" name="password" required minlength="15" '
        'maxlength="256" autocomplete="new-password" aria-describedby="password-hint"></label>'
        '<label class="show-password"><input type="checkbox" id="show-password"> '
        'Passwort anzeigen</label>'
        '<p class="hint" id="password-hint">Mindestens 15 Zeichen. Du kannst eine '
        'lange Passphrase aus mehreren unabhängigen Wörtern wählen. '
        'Kontrolliere und bewahre sie sicher auf, bevor du speicherst. '
        'Du brauchst sie nicht in den Chat zu schreiben.</p>'
        '<button>Statistik-Zugang vorbereiten</button></form>'
        '<p class="hint">Gespeichert wird nur eine gesicherte Passwort-Prüfsumme. '
        'Die Übertragung auf deinen World4You-Webspace und die Aktivierung '
        'erfolgen erst im nächsten Schritt.</p>'
    )
    return (
        '<!doctype html><html lang="de"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>Dein Statistik-Zugang</title><style>'
        'body{font:17px/1.6 system-ui,sans-serif;background:#f8f5ef;color:#343b31;'
        'margin:0}main{max-width:570px;margin:6vh auto;padding:30px}'
        'h1{font:normal 2.4rem/1.2 Georgia,serif}.eyebrow{color:#586b49;'
        'font-size:.85rem}label{display:block;margin:22px 0}input{display:block;'
        'box-sizing:border-box;width:100%;font:inherit;padding:12px;border:1px solid '
        '#9aab8c;border-radius:6px;margin-top:7px}button{font:inherit;'
        'background:#586b49;color:white;border:0;border-radius:7px;padding:13px 20px;'
        'cursor:pointer}.hint{font-size:.9rem;color:#61695b}strong{color:#405338}'
        '.show-password{display:flex;align-items:center;gap:10px}'
        '.show-password input{display:inline-block;width:20px;height:20px;margin:0}'
        '</style></head><body><main>' + body + '</main>'
        f'<script nonce="{SCRIPT_NONCE}">'
        'const toggle=document.getElementById("show-password");'
        'if(toggle)toggle.addEventListener("change",()=>{'
        'document.getElementById("password").type=toggle.checked?"text":"password";});'
        '</script></body></html>'
    ).encode()


class Setup(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def page(self, body, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        # A no-referrer document can give same-origin form POSTs an opaque
        # ("null") Origin. Keep the exact Origin check and preserve it here.
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", f"default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-{SCRIPT_NONCE}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(body)

    def allowed_host(self):
        return self.headers.get("Host") == f"127.0.0.1:{PORT}"

    def do_GET(self):
        if not self.allowed_host() or self.path != "/":
            self.page(b"Nicht gefunden.", 404)
            return
        self.page(render(done=OUTPUT.exists()))

    def do_POST(self):
        if not self.allowed_host() or self.path != "/speichern" or self.headers.get("Origin") != ORIGIN:
            self.page(b"Nicht erlaubt.", 403)
            return
        if OUTPUT.exists():
            self.page(render(done=True))
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 8192:
                raise ValueError()
            fields = parse_qs(self.rfile.read(length).decode("utf-8"), strict_parsing=True)
            if not hmac.compare_digest(fields.get("token", [""])[0], TOKEN):
                raise ValueError()
            password = fields.get("password", [""])[0]
            if not 15 <= len(password) <= 256 or len(password.encode()) > 1024:
                self.page(render(error="Bitte mindestens 15 Zeichen wählen."), 400)
                return
            salt = secrets.token_bytes(32)
            verifier = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000).hex()
            OUTPUT.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            fd = os.open(OUTPUT, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w") as target:
                target.write("<?php\nreturn ['version' => 1, 'salt' => '" + salt.hex() + "', 'hash' => '" + verifier + "'];\n")
            self.send_response(303)
            self.send_header("Location", "/")
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        except (ValueError, UnicodeError):
            self.page(render(error="Bitte die Seite neu öffnen und erneut versuchen."), 400)


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), Setup)
    print(f"Statistik-Zugang lokal vorbereiten: {ORIGIN}/", flush=True)
    server.serve_forever()
