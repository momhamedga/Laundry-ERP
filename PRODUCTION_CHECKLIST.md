# Production Go-Live Checklist

Work through every item before deploying to a live laundry. Legend: ☐ to do.

## Windows installation (desktop)
- ☐ Build a **signed** NSIS installer + portable (code-signing certificate).
- ☐ Verify install on a clean Windows 10/11 x64 machine.
- ☐ Verify **desktop shortcut**, **Start Menu** entry, and **file associations**
  (.laundry/.invoice/.receipt).
- ☐ Verify **upgrade** over a previous version preserves user data.
- ☐ Verify **repair** and **uninstall** (and that user data handling is as intended).

## API deployment
- ☐ Build (`prisma migrate deploy` applied) and run under a process manager/service.
- ☐ Health check `GET /api/v1/health` returns 200.
- ☐ Reverse proxy configured; not exposed directly.

## Database
- ☐ Managed Postgres/Neon provisioned with automated backups + PITR.
- ☐ Connection pooling sized for expected load.
- ☐ Migrations applied; no manual schema edits.

## Environment variables
- ☐ `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` set (strong, unique).
- ☐ Secrets stored in a secrets manager / service config, **not** in the repo or
  installer.
- ☐ Default admin password **changed**.

## SSL / TLS
- ☐ HTTPS for API and Admin (valid certificate).
- ☐ HSTS enabled; secure cookies in production.

## Backups
- ☐ Server DB backups automated + tested restore.
- ☐ Desktop local backups enabled (daily + on-exit) with a retention policy.
- ☐ Understand that encrypted desktop backups are **machine-bound** (see docs).

## Restore
- ☐ Rehearse a server DB restore.
- ☐ Rehearse a desktop restore on the same machine.

## Monitoring
- ☐ API uptime + error monitoring.
- ☐ Log retention configured.
- ☐ Crash reports reviewed (desktop `crashes/` + minidumps).

## Updates
- ☐ Auto-update publish configured (GitHub Releases) with installer + `latest.yml`.
- ☐ Rollback plan for a bad release.

## Electron
- ☐ contextIsolation/sandbox/nodeIntegration verified (default: hardened).
- ☐ CSP active; navigation lock active.
- ☐ Clean shutdown verified (DB closed, schedules stopped).

## Offline
- ☐ Verify offline create (customer/order/payment) and auto-sync on reconnect.
- ☐ Verify conflict resolution (duplicate customer) and dead-letter retry/discard.

## Hardware (on-site)
- ☐ Receipt/thermal printer — silent print + cash drawer pulse.
- ☐ A4 printer — invoice print.
- ☐ Label printer — barcode label.
- ☐ USB barcode scanner — scan → order lookup.
- ☐ Camera — capture attach.

## Performance
- ☐ Validate acceptable response times at your expected data volume.
- ☐ Prefer keyset pagination for very large lists (deep OFFSET is O(n)).

## Security
- ☐ Complete the audit in [SECURITY](docs/SECURITY.md).
- ☐ Sign the installer; consider an EV certificate to reduce SmartScreen friction.
- ☐ Review RBAC for each role in your org.

---

### Measured-now status (this build)
Backend + Neon, offline/sync/conflict, encryption, CSP, backup/restore, 100k-scale
DB performance: **verified** (see the final report / CHANGELOG). Installer build,
all hardware, and UI visual QA: **NOT YET VERIFIED / NOT TESTED** — complete the
boxes above on target infrastructure and devices.
