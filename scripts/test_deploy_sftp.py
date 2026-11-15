import json
from pathlib import Path
import tempfile
import unittest

from deploy_sftp import IN_PROGRESS, MANIFEST, deploy


class FakeSFTP:
    def __init__(self, root):
        self.root = root
        self.uploads = []
        self.fail_on = None

    def stat(self, path):
        return (self.root / path).stat()

    def open(self, path, mode):
        return (self.root / path).open(mode)

    def mkdir(self, path):
        (self.root / path).mkdir()

    def remove(self, path):
        (self.root / path).unlink()

    def put(self, source, destination):
        if destination == self.fail_on:
            raise OSError("Simulated upload failure")
        (self.root / destination).write_bytes(Path(source).read_bytes())
        self.uploads.append(destination)


class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.source = root / "website"
        self.source.mkdir()
        remote = root / "remote"
        remote.mkdir()
        self.sftp = FakeSFTP(remote)
        (self.source / "index.html").write_text("original")
        (self.source / "assets").mkdir()
        (self.source / "assets" / "image.bin").write_bytes(b"\x00\xff")

    def deploy(self, **kwargs):
        self.sftp.uploads.clear()
        deploy(self.sftp, self.source, **kwargs)
        return self.sftp.uploads

    def test_first_upload_then_unchanged_files_are_skipped(self):
        self.assertEqual(self.deploy(), ["assets/image.bin", "index.html"])
        (self.source / "index.html").touch()
        self.assertEqual(self.deploy(), [])
        self.assertFalse((self.sftp.root / IN_PROGRESS).exists())

    def test_only_changed_and_new_files_uploaded(self):
        self.deploy()
        (self.source / "index.html").write_text("modified")
        (self.source / "new file.txt").write_text("new")
        self.assertEqual(self.deploy(), ["index.html", "new file.txt"])

    def test_full_upload_repairs_remote_edits(self):
        self.deploy()
        (self.sftp.root / "index.html").write_text("remote edit")
        self.assertEqual(self.deploy(full_upload=True), ["assets/image.bin", "index.html"])
        self.assertEqual((self.sftp.root / "index.html").read_text(), "original")

    def test_deleted_files_are_left_on_server(self):
        self.deploy()
        (self.source / "index.html").unlink()
        self.assertEqual(self.deploy(), [])
        self.assertTrue((self.sftp.root / "index.html").exists())
        manifest = json.loads((self.sftp.root / MANIFEST).read_text())
        self.assertNotIn("index.html", manifest["files"])

    def test_failure_retains_manifest_and_next_run_recovers_even_after_revert(self):
        self.deploy()
        original_manifest = (self.sftp.root / MANIFEST).read_bytes()
        (self.source / "assets" / "image.bin").write_bytes(b"changed")
        (self.source / "index.html").write_text("modified")
        self.sftp.fail_on = "index.html"
        with self.assertRaises(OSError):
            self.deploy()
        self.assertEqual((self.sftp.root / MANIFEST).read_bytes(), original_manifest)
        self.assertTrue((self.sftp.root / IN_PROGRESS).exists())
        (self.source / "assets" / "image.bin").write_bytes(b"\x00\xff")
        self.sftp.fail_on = None
        self.assertEqual(self.deploy(), ["assets/image.bin", "index.html"])
        self.assertEqual((self.sftp.root / "assets/image.bin").read_bytes(), b"\x00\xff")

    def test_invalid_manifest_requires_full_upload(self):
        (self.sftp.root / MANIFEST).write_text("broken json")
        with self.assertRaises(ValueError):
            self.deploy()
        self.assertEqual(len(self.deploy(full_upload=True)), 2)

    def test_incomplete_manifest_publication_triggers_recovery(self):
        self.deploy()
        (self.sftp.root / MANIFEST).write_text("partial json")
        (self.sftp.root / IN_PROGRESS).write_text("interrupted")
        self.assertEqual(len(self.deploy()), 2)

    def test_permission_errors_do_not_trigger_full_upload(self):
        def denied(path):
            raise PermissionError(13, "Permission denied")
        self.sftp.stat = denied
        with self.assertRaises(PermissionError):
            self.deploy()
        self.assertEqual(self.sftp.uploads, [])


if __name__ == "__main__":
    unittest.main()
