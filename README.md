# Laundry ERP — Enterprise Edition

A production-grade ERP for laundry / dry-cleaning businesses: a web admin dashboard
backed by an enterprise API, plus a Windows desktop application that works **fully
offline** and **auto-syncs** when connectivity returns.

**Current release:** v1.3.0 · **Repository:** https://github.com/momhamedga/Laundry-ERP

---

## What's included

| Layer | Stack | Purpose |
|---|---|---|
| **API** (`apps/api`) | Express 5 · Prisma 6 · PostgreSQL (Neon) | Business logic, auth (JWT), RBAC, all modules |
| **Admin** (`apps/admin`) | Next.js 16 · React 19 · Tailwind | Web dashboard (orders, customers, payments, reports, HR, settings) |
| **Desktop** (`apps/desktop`) | Electron 33 · better-sqlite3 (SQLCipher) | Offline-first Windows app that reuses the Admin UI + API |

## Core capabilities

- **Modules:** customers, orders (+ items, statuses), payments, invoices, services &
  categories, inventory, suppliers, purchases, branches, employees/HR, coupons,
  loyalty, membership, day-closing, reports, notifications, settings, admin.
- **Desktop offline platform:** local encrypted SQLite, offline create/read/update,
  background sync engine, conflict resolution, dead-letter queue, auto-backup +
  restore, barcode/label generation, camera capture, USB-scanner input, printing,
  tray, multi-window, crash reporter, auto-update.
- **Security:** JWT with refresh rotation, RBAC, contextIsolation + sandbox on all
  Electron windows, CSP, SQLite encrypted at rest with an OS-keystore-sealed key.

## Repository layout

```
apps/
  api/       Express + Prisma API          (prisma/schema.prisma, prisma/seed*.ts)
  admin/     Next.js admin dashboard
  desktop/   Electron desktop app          (src/main, src/preload, src/shared)
docs/        Documentation (this set)
CHANGELOG.md · LICENSE.md · CONTRIBUTING.md · CODE_OF_CONDUCT.md · PRODUCTION_CHECKLIST.md
```

## Quick start (development)

```bash
pnpm install
# API — configure apps/api/.env (DATABASE_URL, JWT secrets), then:
pnpm --filter @laundry/api exec prisma migrate deploy
pnpm --filter @laundry/api exec tsx prisma/seed.ts    # admin user
pnpm --filter @laundry/api dev                        # http://127.0.0.1:4000
pnpm --filter @laundry/admin dev                      # http://localhost:3000
pnpm --filter @laundry/desktop dev                    # Electron shell
```

Default admin (change immediately): `admin@laundry.local` / `Admin@12345`.
Demo dataset (against a demo DB): `pnpm --filter @laundry/api exec tsx prisma/seed-demo.ts`.

## Documentation

| Doc | Contents |
|---|---|
| [INSTALL](docs/INSTALL.md) | Prerequisites, install, build |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | API + Admin + Desktop deployment |
| [USER_GUIDE](docs/USER_GUIDE.md) | Day-to-day operator guide |
| [ADMIN_GUIDE](docs/ADMIN_GUIDE.md) | Administration & configuration |
| [OFFLINE_MODE](docs/OFFLINE_MODE.md) | How offline works |
| [SYNC_ENGINE](docs/SYNC_ENGINE.md) | Sync + conflict resolution internals |
| [BACKUP_AND_RESTORE](docs/BACKUP_AND_RESTORE.md) | Backups & recovery |
| [SECURITY](docs/SECURITY.md) | Security model & posture |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design |
| [API_DOCUMENTATION](docs/API_DOCUMENTATION.md) | REST endpoints |
| [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) | Common issues |
| [PRODUCTION_CHECKLIST](PRODUCTION_CHECKLIST.md) | Go-live checklist |
| [WINDOWS_QA_CHECKLIST](docs/WINDOWS_QA_CHECKLIST.md) | Desktop QA matrix |
| [ROADMAP](docs/ROADMAP.md) | Version history, limitations, future |

## Known limitations (honest)

- The Windows installer (NSIS + portable) **builds and installs**, but is **not
  code-signed** — Windows SmartScreen will warn on first run until an OV/EV
  certificate is configured. See [ROADMAP](docs/ROADMAP.md).
- Hardware features (thermal/label printer, USB scanner, cash drawer, live camera)
  require **on-site verification** with the actual devices.
- Authenticated UI screens have not been through a formal visual QA pass; see
  [WINDOWS_QA_CHECKLIST](docs/WINDOWS_QA_CHECKLIST.md).

## License

Proprietary — see [LICENSE.md](LICENSE.md).
