"""Exercise the PHP counter using a real PHP CLI and isolated temporary data."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--php-command", nargs="+", default=["php"])
    command = parser.parse_args().php_command
    command = [str((ROOT / item).resolve()) if item.endswith(".js") else item for item in command]
    with tempfile.TemporaryDirectory(prefix="statistik-test-") as directory:
        source = Path(directory).resolve() / "statistik"
        shutil.copytree(ROOT / "website/statistik", source)
        private = source / "privat"
        (private / "zugang.php").unlink(missing_ok=True)
        (private / "aufrufe.php").unlink(missing_ok=True)

        def php(code):
            result = subprocess.run(command + ["-r", code], capture_output=True, text=True, cwd=directory, timeout=45)
            if result.returncode != 0 or result.stderr.strip():
                raise AssertionError(result.stdout + result.stderr)
            return result.stdout

        def request(endpoint, setup=""):
            return php("putenv('STATISTIK_LOCAL_TEST=1');ini_set('session.save_path'," + json.dumps(str(private)) + ");" + setup
                       + "register_shutdown_function(function(){echo '\\nSTATUS=' . http_response_code();});"
                       + "require " + json.dumps(str(source / endpoint)) + ";")

        for file in source.glob("*.php"):
            result = subprocess.run(command + ["-l", str(file)], capture_output=True, text=True, timeout=45)
            assert result.returncode == 0, result.stdout + result.stderr

        initial = request("index.php")
        assert "STATUS=503" in initial, initial
        good_request = "$_SERVER['REQUEST_METHOD']='POST';$_SERVER['HTTP_ORIGIN']='https://shiatsu-kellner.at';"
        assert "STATUS=503" in request("zaehlen.php", good_request)
        assert not (private / "aufrufe.php").exists()

        salt = bytes(range(32))
        password = "Disposable local test password!"
        verifier = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000).hex()
        (private / "zugang.php").write_text("<?php return ['version'=>1,'salt'=>'" + salt.hex() + "','hash'=>'" + verifier + "'];")
        login_page = request("index.php")
        assert "<button>Anmelden</button>" in login_page, login_page
        assert "<button>Anmelden</button>" in request("index.php", "$_SERVER['PHP_AUTH_USER']='Daniela';$_SERVER['PHP_AUTH_PW']='incorrect';")
        authenticated = "$_SERVER['PHP_AUTH_USER']='Daniela';$_SERVER['PHP_AUTH_PW']='" + password + "';"
        assert "Deine Website-Statistik" in request("index.php", authenticated)
        # Exercise form login across separate PHP requests, including session
        # rotation, CSRF checks, wrong credentials and logout.
        session_id = "disposabletestsession123456789"
        seed = ("session_name('daniela_statistik');session_id('" + session_id
                + "');session_start();$_SESSION['csrf']='test-csrf';session_write_close();")
        form = "$_SERVER['REQUEST_METHOD']='POST';$_POST=['action'=>'login','csrf'=>'test-csrf','username'=>'Daniela','password'=>" + json.dumps(password) + "];"
        assert "STATUS=403" in request("index.php", seed + form + "$_POST['csrf']='wrong';")
        assert "STATUS=401" in request("index.php", seed + form + "$_POST['password']='wrong password';")
        assert "STATUS=303" in request("index.php", seed + form)
        sessions = [file for file in private.glob("sess_*") if "auth|" in file.read_text()]
        assert len(sessions) == 1
        rotated = sessions[0].name.removeprefix("sess_")
        assert rotated != session_id
        current_session = "session_id('" + rotated + "');"
        assert "Deine Tageswerte" in request("index.php", current_session)
        token = __import__('re').search(r'csrf\|s:\d+:"([a-f0-9]+)"', sessions[0].read_text()).group(1)
        logout = "$_SERVER['REQUEST_METHOD']='POST';$_POST=['action'=>'logout','csrf'=>'" + token + "'];"
        assert "STATUS=303" in request("index.php", current_session + logout)
        assert "<button>Anmelden</button>" in request("index.php", current_session)
        assert "STATUS=405" in request("zaehlen.php", "$_SERVER['REQUEST_METHOD']='GET';")
        assert "STATUS=403" in request("zaehlen.php", "$_SERVER['REQUEST_METHOD']='POST';$_SERVER['HTTP_ORIGIN']='https://example.org';")
        assert "STATUS=403" in request("zaehlen.php", good_request + "$_SERVER['CONTENT_LENGTH']='1';")
        assert "STATUS=204" in request("zaehlen.php", good_request + "$_SERVER['HTTP_USER_AGENT']='Googlebot';")
        assert not (private / "aufrufe.php").exists()
        for _ in range(2):
            assert "STATUS=204" in request("zaehlen.php", good_request)
        stored = (private / "aufrufe.php").read_text()
        assert stored.startswith("<?php http_response_code(404); exit; ?>\n")
        data = json.loads(stored.split("\n", 1)[1])
        assert set(data) == {"version", "started", "days"}
        assert list(data["days"].values()) == [2]
        assert "STATUS=404" in request("privat/aufrufe.php")
        rendered = request("index.php", authenticated)
        assert '<span class="value">2</span>' in rendered, rendered
        # Basic authorization fallback is needed on some FastCGI hosting setups.
        import base64
        auth = base64.b64encode(("Daniela:" + password).encode()).decode()
        assert "Deine Website-Statistik" in request("index.php", "$_SERVER['HTTP_AUTHORIZATION']='Basic " + auth + "';")
        php("require " + json.dumps(str(source / "lib.php")) + ";$p=STATS_PRIVATE.'/aufrufe.php';$d=stats_snapshot();$d['days']['2020-01-01']=99;file_put_contents($p,STATS_GUARD.json_encode($d));stats_increment();")
        after = json.loads((private / "aufrufe.php").read_text().split("\n", 1)[1])
        assert "2020-01-01" not in after["days"]
        assert list(after["days"].values()) == [3]
        (private / "aufrufe.php").write_text("corrupt data")
        assert "STATUS=503" in request("zaehlen.php", good_request)
        assert (private / "aufrufe.php").read_text() == "corrupt data"
    print("PHP counter checks passed: protected access, missing setup, correct/wrong login, origin/method/body checks, bot skip, daily increments, storage guard, retention and corruption handling.")


if __name__ == "__main__":
    main()
