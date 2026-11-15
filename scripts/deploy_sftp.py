"""Upload content-changed website files and publish a SHA-256 manifest last."""

import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

MANIFEST = ".deploy-manifest.json"
IN_PROGRESS = ".deploy-in-progress"


def exists(sftp, path):
    try:
        sftp.stat(path)
        return True
    except OSError as error:
        if error.errno != errno.ENOENT:
            raise
        return False


def read_manifest(sftp):
    try:
        with sftp.open(MANIFEST, "r") as remote:
            manifest = json.load(remote)
    except OSError as error:
        if error.errno != errno.ENOENT:
            raise
        return {}
    if (
        not isinstance(manifest, dict)
        or manifest.get("version") != 1
        or not isinstance(manifest.get("files"), dict)
        or not all(isinstance(k, str) and isinstance(v, str)
                   for k, v in manifest["files"].items())
    ):
        raise ValueError("Invalid deployment manifest; use full_upload to replace it")
    return manifest["files"]


def deploy(sftp, source, full_upload=False):
    # A failed upload can leave remote content different from the old manifest.
    # Force a full recovery even if the next commit reverts those changed files.
    recovery = exists(sftp, IN_PROGRESS)
    previous = {} if full_upload or recovery else read_manifest(sftp)
    files = {}
    for path in sorted(source.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlinks are not supported: {path}")
        if path.is_file():
            relative = path.relative_to(source).as_posix()
            if relative in (MANIFEST, IN_PROGRESS):
                raise ValueError(f"Reserved deployment filename: {relative}")
            files[relative] = hashlib.sha256(path.read_bytes()).hexdigest()

    changed = [name for name, digest in files.items() if previous.get(name) != digest]
    print(f"Uploading {len(changed)} of {len(files)} files", flush=True)
    if recovery:
        print("Recovering from an interrupted deployment with a full upload", flush=True)

    with sftp.open(IN_PROGRESS, "w") as remote:
        remote.write("Deployment in progress\n")
    directories = set()
    for name in changed:
        for parent in reversed(Path(name).parents):
            directory = parent.as_posix()
            if directory != "." and directory not in directories:
                if not exists(sftp, directory):
                    sftp.mkdir(directory)
                directories.add(directory)
        print(f"Uploading {name}", flush=True)
        sftp.put(str(source / name), name)

    # Keep the marker until publication succeeds. A partial manifest write will
    # therefore trigger a full recovery rather than skipping required uploads.
    with sftp.open(MANIFEST, "w") as remote:
        remote.write(json.dumps({"version": 1, "files": files}, sort_keys=True) + "\n")
    sftp.remove(IN_PROGRESS)
    print("Deployment complete; remote-only files were left untouched", flush=True)


def main():
    import paramiko

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("website"))
    parser.add_argument("--full-upload", action="store_true")
    args = parser.parse_args()
    if not args.source.is_dir():
        parser.error("Source must be an existing directory")
    for name in ("SFTP_URL", "SFTP_USERNAME", "SFTP_PASSWORD"):
        if not os.environ.get(name):
            parser.error(f"Missing {name}")
    url = urlsplit(os.environ["SFTP_URL"])
    if url.scheme != "sftp" or not url.hostname:
        parser.error("SFTP_URL must be an sftp:// URL")

    with paramiko.SSHClient() as client:
        # Matches the existing deployment's host-key policy. Pin a known host
        # key separately if host verification is enabled in the future.
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            url.hostname, port=url.port or 22,
            username=os.environ["SFTP_USERNAME"],
            password=os.environ["SFTP_PASSWORD"],
            look_for_keys=False, allow_agent=False,
            timeout=30, auth_timeout=30, banner_timeout=30,
        )
        with client.open_sftp() as sftp:
            sftp.get_channel().settimeout(30)
            sftp.chdir(unquote(url.path) or ".")
            deploy(sftp, args.source, args.full_upload)


if __name__ == "__main__":
    main()
