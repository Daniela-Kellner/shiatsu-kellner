"""Regression checks for the local password setup, with disposable test data."""

import hashlib
import http.client
import importlib.util
from pathlib import Path
import re
import tempfile
import threading
import unittest
from urllib.parse import urlencode
from http.server import HTTPServer


class SetupTests(unittest.TestCase):
    def test_form_origin_csrf_and_password_verifier(self):
        spec = importlib.util.spec_from_file_location(
            "local_statistik_setup", Path(__file__).with_name("statistik-zugang.py")
        )
        setup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(setup)
        with tempfile.TemporaryDirectory(prefix="statistik-form-test-") as directory:
            setup.OUTPUT = Path(directory) / "zugang.php"
            server = HTTPServer(("127.0.0.1", 0), setup.Setup)
            setup.PORT = server.server_port
            setup.ORIGIN = f"http://127.0.0.1:{setup.PORT}"
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()

            def request(method, path, fields=None, headers=None):
                connection = http.client.HTTPConnection("127.0.0.1", setup.PORT, timeout=3)
                body = urlencode(fields).encode() if fields else None
                connection.request(method, path, body=body, headers=headers or {})
                response = connection.getresponse()
                result = response.status, dict(response.getheaders()), response.read().decode()
                connection.close()
                return result

            try:
                status, headers, page = request("GET", "/")
                self.assertEqual(status, 200)
                # no-referrer can make a browser's POST Origin "null", rejecting
                # the legitimate form. Preserve same-origin POST attribution.
                self.assertEqual(headers["Referrer-Policy"], "same-origin")
                self.assertEqual(page.count('name="password"'), 1)
                self.assertNotIn('name="repeat"', page)
                self.assertIn('Passwort anzeigen', page)
                token = re.search(r'name="token" value="([^"]+)"', page).group(1)
                password = "TestOnly12345!?"
                self.assertEqual(len(password), 15)
                fields = {"token": token, "password": password}
                for origin in [None, "null", "https://example.org"]:
                    headers = {"Origin": origin} if origin else {}
                    self.assertEqual(request("POST", "/speichern", fields, headers)[0], 403)
                    self.assertFalse(setup.OUTPUT.exists())
                self.assertEqual(request("POST", "/speichern", {**fields, "token": "wrong"}, {"Origin": setup.ORIGIN})[0], 400)
                self.assertFalse(setup.OUTPUT.exists())
                self.assertEqual(request("POST", "/speichern", {**fields, "password": "too short"}, {"Origin": setup.ORIGIN})[0], 400)
                self.assertFalse(setup.OUTPUT.exists())
                status, headers, _ = request("POST", "/speichern", fields, {"Origin": setup.ORIGIN})
                self.assertEqual(status, 303)
                self.assertEqual(headers["Location"], "/")
                stored = setup.OUTPUT.read_text()
                self.assertNotIn(password, stored)
                salt = re.search(r"'salt' => '([a-f0-9]{64})'", stored).group(1)
                verifier = re.search(r"'hash' => '([a-f0-9]{64})'", stored).group(1)
                expected = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600000).hex()
                self.assertEqual(verifier, expected)
                self.assertEqual(setup.OUTPUT.stat().st_mode & 0o777, 0o600)
                self.assertIn("Dein Statistik-Zugang ist vorbereitet.", request("GET", "/")[2])
            finally:
                server.shutdown()
                server.server_close()
                worker.join()


if __name__ == "__main__":
    unittest.main()
