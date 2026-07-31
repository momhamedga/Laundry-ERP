# Backup & Restore

The desktop app takes local backups of the offline database and settings, on a
schedule and on demand.

## What is backed up

A backup is a single **gzip-compressed, signed** file
(`<kind>-<timestamp>.json.gz`, magic `LAUNDRY_DESKTOP_BACKUP_V1`) in the app's
`backups` folder, containing:

- `desktop-settings.json`, `desktop-config.json` — local desktop settings.
- `laundry-offline.db` — the **encrypted SQLite database** (customers, orders,
  order items, payments, sync queue, caches), embedded as base64 after a WAL
  checkpoint for a consistent snapshot.

> **Fixed in v1.3.0:** earlier versions backed up only the settings JSON and
> **omitted the database**. Backups now include it.

## Schedules & retention

Configured in desktop settings (`backup`):

- `daily`, `weekly` schedules, and `onExit` (backup on quit).
- `retentionDays` — older backups are pruned automatically.

## Creating a backup

- Automatically per the schedule above.
- Manually from the tray / UI (`desktop.backup.run()`), which also fires a
  "backup completed" notification.

## Restoring

`desktop.backup.restore(file)`:

1. Restores the settings JSON files.
2. If the backup contains the database: closes the current DB, writes the bytes
   back, clears stale `-wal`/`-shm`, and reopens with the sealed key.

Returns the list of restored items (including `laundry-offline.db`).

## Important: encryption & portability

The database is encrypted with a key sealed by **DPAPI (Windows) bound to the user
and machine**. Therefore:

- ✅ Restore works on the **same Windows user/machine** that created the backup
  (e.g. after resetting settings, or reinstalling the app for the same user).
- ❌ An encrypted backup **cannot** be restored on a different machine/user, because
  the key does not travel. Cross-machine migration is a future item (passphrase
  export). Plan disaster recovery around **server-side** data (synced records) for
  cross-machine scenarios.

## Verification status (measured)

Verified under Electron: create 1 customer + 3 orders offline → backup (169 KB,
includes the DB) → wipe all rows → restore brings the data back → survives an app
restart (encrypted reopen).
