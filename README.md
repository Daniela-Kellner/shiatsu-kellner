# Webpage Shiatsu Kellner

- <https://shiatsu-kellner.at/>

## SFTP deployment

The SFTP workflow compares SHA-256 hashes against `.deploy-manifest.json` in
the remote website directory and uploads only new or content-changed files.
The first deployment uploads everything. Files removed locally are not deleted
from the server.

The manifest is published after all file uploads succeed. An in-progress marker
forces a full upload after an interrupted deployment, including failed manifest
writes. To repair manual remote edits or replace an invalid manifest, run the
workflow manually with **full_upload** enabled.

Deployment uses `SFTP_URL` (including the remote directory), `SFTP_USERNAME`, and
`SFTP_PASSWORD`. The server needs only SFTP, not SSH command access or rsync.
Host keys are currently accepted automatically, matching the previous workflow.

Run deployment tests locally with:

```sh
python3 -m unittest discover -s scripts -p 'test_*.py'
```
