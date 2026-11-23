# Persönliche Website-Statistik

Am 23. November 2026 aktiviert. Der frühere externe Zähler wird nicht mehr
angesprochen. Die PHP-Dateien funktionieren nur auf dem bestehenden
World4You-Webspace, nicht auf GitHub Pages. Die alte externe Datenbank wurde
weder verändert noch importiert.

Die echte Startseite wurde aufgerufen; anschließend zeigte die angemeldete
Übersicht einen neuen Aufruf für heute, diesen Monat und die letzten 30 Tage.
Der geschützte Unterordner liefert im Browser 403. Die Zugangskonfiguration
wurde über den authentifizierten WebFTP-Zugang separat hochgeladen; sie ist
nicht in Git enthalten.

## Einrichtung

1. `python3 scripts/statistik-zugang.py` lokal starten. Daniela füllt das
   Formular auf `http://127.0.0.1:8779/` selbst aus. Das Passwort weder abfragen
   noch aus dem Formular lesen. Benutzername: `Daniela`.
2. PHP-Dateien prüfen, dann auf World4You veröffentlichen. Ohne Konfiguration
   bleiben Zähler und Übersicht geschlossen (503), ohne öffentlichen Setupweg.
3. Die ausschließlich lokal erzeugte Datei `tmp/statistik-zugang/zugang.php`
   nach `statistik/privat/zugang.php` auf Danielas Webspace hochladen. Nie in Git
   übernehmen und weder Inhalt noch Prüfsumme in Chat oder Protokolle ausgeben.
4. HTTPS, Verzeichnisschutz, Anmeldung und Zählung auf dem echten Hosting prüfen.
   Daniela meldet sich selbst an. Ohne Anmeldung dürfen keine Werte sichtbar
   sein; `/statistik/privat/zugang.php` muss 403/404 liefern.
5. Erst danach `website/pageview.js` vom externen Endpunkt auf
   `/statistik/zaehlen.php` umstellen. Nur die beiden echten Praxisdomains zählen;
   lokale Vorschauen und GitHub Pages auslassen. Datenschutzhinweis in app.js
   an die tatsächlich eingesetzte Zählung anpassen. Vorherige Werte nicht
   erfinden oder als übernommen darstellen.

Die Statistik erfasst nur Tageszähler nach Europe/Vienna und bewahrt 400 Tage
auf. Keine IP-Adressen, Cookies, Besucher-IDs, Seitenpfade oder Referrer in den
Zählerdaten. Technische Hoster-Logs bleiben davon unabhängig. Wiederholtes
Laden zählt erneut. Bekannte Bot-User-Agents werden übersprungen, ohne Anspruch
auf vollständige Bot-Erkennung. Öffentliche Zähler lassen sich manipulieren;
die Zahlen dienen nur zur Orientierung, nicht zur Abrechnung von Werbung.

Zugang: PBKDF2-HMAC-SHA256 mit 600.000 Runden und zufälligem 32-Byte-Salt,
Formularanmeldung ausschließlich über HTTPS mit CSRF-Schutz, Wechsel der
Sitzungskennung bei Anmeldung und einem Secure-/HttpOnly-/SameSite-Strict-Cookie
nur im Statistikbereich. Nach 30 Minuten ohne Aktivität ist eine erneute
Anmeldung nötig; Abmelden beendet die Sitzung. HTTP Basic bleibt für
authentifizierte Prüfwerkzeuge unterstützt. Keine öffentlichen Reset-/Setupseiten. Für einen Passwortwechsel muss Daniela die lokale
Einrichtung erneut selbst durchführen; nie ihr bestehendes Passwort auslesen.

## Prüfen

Mit installiertem PHP:

```sh
python3 scripts/test_statistik.py
```

Die Tests verwenden ausschließlich ein temporäres Verzeichnis und ein
wegwerfbares Testpasswort, niemals die echte Zugangskonfiguration.
