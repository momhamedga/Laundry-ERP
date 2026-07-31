# Troubleshooting

## Desktop

**The app shows a connection error / "server unavailable".**
The desktop needs its API. Verify the API is running and reachable
(`GET /api/v1/health` → 200). The app still works **offline** for
customers/orders/payments; data uploads when the API is reachable again.

**"offline DB init failed" in the logs.**
The native SQLite module must match the Electron ABI. If you rebuilt Node modules,
run `@electron/rebuild` for the desktop app. Logs are in the app's user-data folder
under `logs/main.log`.

**After upgrading, the app created a `laundry-offline.db.legacy-…` file.**
Expected when moving to encryption: a previous **plaintext** database that can't be
opened with the encryption key is backed up to `*.legacy` and a fresh encrypted DB
is created. The legacy file contains your old (pre-encryption) local data.

**Pending items never sync.**
Check connectivity and that you're signed in (the sync engine needs a valid token).
Review the **dead-letter** list for items that failed permanently (e.g. validation
conflicts) and retry or discard them.

**A backup won't restore on another PC.**
Encrypted backups are bound to the Windows user/machine (DPAPI key). Restore on the
original machine, or recover cross-machine data from the **server** database. See
[BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.md).

**Printer / scanner / cash drawer doesn't work.**
These require the physical device connected and configured in **Settings**. Verify
the device with its own utility first. Silent printing needs a configured default
printer.

**Auto-update says an error / finds nothing.**
Updates require a published GitHub Release containing the installer artifacts **and**
`latest.yml`. If those assets aren't published, the check will 404 on `latest.yml`.

## API

**`Invalid environment variables` on startup.**
The API validates its environment. Ensure `DATABASE_URL`, `JWT_ACCESS_SECRET`, and
`JWT_REFRESH_SECRET` are set in `apps/api/.env`. (The desktop installer intentionally
does **not** bundle secrets.)

**Migrations fail / schema drift.**
Run `prisma migrate deploy` against the correct `DATABASE_URL`. Do not edit the
schema on a production database manually.

## Build / packaging

**Native module gyp error during install.**
This environment can't compile natives. Install with `--ignore-scripts` and fetch
Electron-ABI prebuilts via `@electron/rebuild` (`node <pkg>/lib/cli.js -v <electron
version> -o <module> -m apps/desktop`).

**Installer build stalls (winCodeSign / electron unpack).**
Building the NSIS/portable installer needs reliable tool-cache access and, on
Windows, Developer Mode/admin for symlink extraction. The **unpacked** build
(`electron-builder --dir`) works without these. See [ROADMAP](ROADMAP.md).

## Where are the logs?

- Desktop: `%APPDATA%/@laundry/desktop/logs/main.log`; crash reports under
  `crashes/`; native minidumps under the Electron crash-dumps path.
- API: stdout/your process manager.
