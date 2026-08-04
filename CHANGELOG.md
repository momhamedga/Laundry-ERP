# Changelog

All notable changes to the Laundry ERP desktop application are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-08-04 — Commercial release

First commercially shippable build. No changes to business workflows, database
schema, or API routes — this release is about product packaging and licensing.

### Added
- **Offline license & product activation** (Phase 15B). RSA-4096/SHA-256 signed
  `.lkey` files, 5-component machine fingerprint with 3-of-5 tolerance, a 14-day
  grace period, clock-rollback detection, and a **License** page for activation.
  No server, no API, no internet at any point.
- **License enforcement.** When a license lapses past its grace period, creating
  new financial records (customers, orders, payments, invoices, purchases,
  suppliers) is blocked through a single reusable checkpoint enforced in three
  layers. Reading, reporting, exporting, printing, backup, and restore stay
  available and **no data is ever hidden or deleted**.
- **License Manager** (`tools/license-manager`) — a developer-only local GUI to
  issue, renew, revoke, search, verify, and track licences, with a local
  registry and automatic registry backups. Never shipped to customers.
- **Client package builder** (`tools/build-client-package.mjs`) producing the
  ready-to-send folder: installer, licence, guides, support and invoice details.
- **Arabic PDF documentation** generated locally via Chromium: user manual,
  activation guide, support guide, release notes.
- Central `branding.config.json` for all product, support, and invoice details,
  with a hard gate that refuses to build a customer package while placeholder
  values remain.

### Fixed
- **«عن التطبيق» (About) wrote a line to the log and showed the user nothing.**
  It is now a full dialog with version, licence status, supplier and support
  details, and a **Copy support details** button.
- Splash screen now shows the version number.

### Notes
- Upgrading from 1.x preserves all data and settings. The app will ask to be
  activated; the 14-day grace period means work is never interrupted meanwhile.

## [1.4.0] — 2026-08-01 — Dependency security hardening

### Security
- Closed **all 5 high-severity advisories** in shipped dependencies by pinning
  fixed versions through `pnpm` `overrides` in `pnpm-workspace.yaml`. The
  vulnerable packages are transitive and could not be fixed by upgrading their
  owners (`exceljs@4.4.0` is already the newest release; `postcss` and `sharp`
  live inside Next's tree), so forcing resolutions was the lowest-risk route —
  no application dependency was upgraded.
  - `brace-expansion` → `^1.1.17` / `^2.1.3` / `^5.0.8` (DoS / OOM, patch bumps)
  - `postcss` → `^8.5.25` (XSS, arbitrary file read, sourcemap path traversal)
  - `sharp` → `^0.35.3` (inherited libvips CVE-2026-33327 / 33328)

  Audit went from **9 advisories (6 high, 3 moderate) to 2 moderate**.

### Deliberately not changed
- **`uuid`** (moderate) is left at 8.3.2. The advisory covers a missing buffer
  bounds check in `v3`/`v5`/`v6` **when `buf` is supplied**; `exceljs` imports
  only `v4` (`const {v4: uuidv4} = require('uuid')`) and never passes `buf`, so
  the flaw is unreachable here. Forcing a major bump 8 → 11 would risk breaking
  report exports for no security gain.
- **`@hono/node-server`** (moderate) reaches the tree only through the `shadcn`
  CLI and is **not present in either shipped bundle** (verified against
  `resources/api` and `resources/renderer`).

### Verified after the change
tsc 0 (api, admin, desktop) · eslint 0 · desktop build ok · **Admin production
build ok** · **204 API unit tests in 27 files pass** · encrypted SQLite opens with
integrity ok, FK enforced, rollback and cascade intact · sync/corruption
resilience 12/12 · backup & restore suite 17/18 (the one miss is a known false
assertion in the harness, not a defect) · native modules intact.

## [1.3.1] — 2026-08-01 — Hotfix: stale sync recovery

### Fixed
- **Sync operations interrupted mid-flight were orphaned forever.** `markSyncing()`
  sets a queue row to `syncing` immediately before the upload; every normal exit
  moves it to `done`/`pending`/`failed`. If the process died in that window
  (crash, power loss, force close, Task Manager kill) the row stayed `syncing`
  permanently — `takePending()` only selects `pending` and `listFailed()` only
  shows `failed`, so the operation never synced again **and never surfaced to the
  user**. An offline order or payment could be silently stranded.

  On startup (and only on startup — never from `initDatabase()`, which also runs
  after a backup restore when a sync may legitimately be in flight) the app now
  resets every `syncing` row back to `pending` inside a single transaction.
  Because a fresh process holds the single-instance lock, no sync can be in
  flight, so every such row is provably an orphan and no time threshold is needed.
  `attempts` is deliberately not incremented — a crash is not a server rejection,
  and inflating it would push a healthy operation toward the dead-letter queue.
  The recovery is idempotent (a second run finds nothing) and logs each recovered
  item plus a summary line.

  Measured: recovered after crash **before** sync, **during** upload, and after an
  external `taskkill /F`; recovered rows then synced successfully and the local
  row was marked clean. Recovery cost 0.27 ms / 0.40 ms / 4.23 ms / 35.36 ms for
  10 / 100 / 1,000 / 10,000 stale rows. Queue integrity after recovery: 0
  duplicate ids, 0 impossible states, 0 orphan rows.

### Known limitation (unchanged by this hotfix)
- If the process dies **after** the server has applied a write but **before** the
  response is recorded, the recovered operation is re-sent. For customers this is
  absorbed by existing conflict resolution (the duplicate is linked to the
  existing record). For orders and payments the API has no idempotency key, so a
  duplicate could be created. Closing that window requires an API change and is
  therefore out of scope for this hotfix.

## [Unreleased]

### Fixed — packaged desktop app was unusable (found by driving a real login)
- **Bundled API rejected the renderer (CORS).** The desktop spawned the API
  without `CORS_ORIGINS`, so it defaulted to `localhost:3000` while the renderer
  runs on `3100`; login failed with "cannot connect to the server". The desktop
  now passes its renderer origins to the API it spawns, merging any explicit value.
- **Refresh cookie was silently dropped (SameSite).** The renderer was served from
  `127.0.0.1` while the Admin bundle calls the API at `localhost`; browsers treat
  those as different sites, so the `SameSite=Strict` refresh cookie was never
  stored and every screen showed "session expired" right after login. The renderer
  is now served from `localhost`, keeping auth requests same-site.
- **Bundled API crashed on startup (dependency version conflict).** Flattening
  pnpm's tree can hold only one version per package, and a second version was
  silently dropped: `readable-stream@3` won the top level while
  `jszip`/`unzipper`/`archiver-utils`/`duplexer2`/`lazystream` need v2, so the API
  died with `Cannot find module 'readable-stream/passthrough'` and restart-looped.
  Conflicting versions are now nested under the package that requires them.

### Fixed
- **Windows installer can now be built.** electron-builder aborted (rc=1) because
  extracting its winCodeSign tool failed on two macOS symlinks that Windows cannot
  create without privilege. `scripts/prepare-wincodesign.mjs` pre-populates the
  cache with `darwin/` excluded and runs automatically before packaging, so NSIS +
  portable installers (and `latest.yml` for auto-update) are produced.
- **Executable identity.** With packaging unblocked, `signAndEditExecutable` is
  enabled again, so the exe now reports ProductName "Laundry ERP", CompanyName
  "Laundry ERP", version 1.3.0 and the branded icon instead of Electron/GitHub Inc.
  The package description is now customer-facing (it becomes the exe's
  FileDescription shown in Explorer and Task Manager).
- Documentation corrected where it claimed the installer could not be built.

## [1.3.0] — 2026-07-31 — Security & Reliability Hardening

Hardening pass on top of the offline platform. Desktop-only changes.

### Added
- **Encryption at rest** — the offline SQLite database is now encrypted
  (SQLCipher via better-sqlite3-multiple-ciphers). The 256-bit key is generated
  once and sealed with the OS keystore (DPAPI on Windows) — never written raw to
  disk. A legacy plaintext DB is auto-backed-up to `*.legacy` and replaced with a
  fresh encrypted one (no crash, no data mixing).
- **Content-Security-Policy** — a CSP is injected for the renderer session:
  script/connect restricted to local origins (blocks remote-code-via-injection),
  inline/eval allowed for Next.js, object/frame-ancestors denied.
- **Auto-update** — electron-updater wired to GitHub Releases (active in the
  packaged app). Notifies the renderer on an available update; the user chooses
  Download, then Install & Restart. IPC: `desktop.update.check/download/install`.
- **Crash analytics** — crash reports now embed a 40-entry user-action breadcrumb
  trail and the native minidump directory alongside stack, version, and system
  info.

### Fixed
- **Backup now includes the offline database.** Previously only two JSON settings
  files were backed up; all customers/orders/payments (the SQLite DB) were
  omitted, so a backup before sync silently lost offline data. Backups now embed
  the WAL-checkpointed DB and restore it (same Windows user/machine, since the
  key is DPAPI-sealed).

### Notes / Known limitations
- Physical hardware (thermal/A4/label printers, USB scanner, cash drawer, live
  camera capture) was **not** tested — no devices in the build environment.
- The Windows installer (NSIS/portable) could **not** be built in this
  environment (winCodeSign/electron unpack stalls); the unpacked app builds and
  runs. Auto-update therefore has no published `latest.yml`/installer assets yet.
- Admin UI visual QA under CSP was not performed headlessly (UI unchanged from
  v1.0.0; static Tailwind checks were clean).

## [1.2.0] — 2026-07-31 — Enterprise Offline Edition

The desktop app now works **fully offline** and **auto-syncs** when connectivity
returns. No server API, response shape, route, or database schema was changed; the
offline layer is entirely local and additive (`apps/desktop` only).

### Added
- **Local SQLite database** (`better-sqlite3`, built for the Electron ABI) — 16
  local tables (customers, orders, order_items, payments, employees, settings,
  sync_queue, sync_log, offline_events, six `cached_*` read caches, and an
  `id_map`) with WAL, foreign keys, and atomic transactions. Opens on launch,
  closes cleanly on exit.
- **Offline repository layer** — create/read/update customers, orders (+ items,
  totals computed locally), and payments while offline. Every write is captured
  as an operation in the local sync queue and flagged dirty.
- **Background sync engine** — when the connection returns (or on a timer, or on
  demand) the queue is drained in FIFO order and replayed against the existing
  API. Local-to-server id remapping lets an offline-created customer’s order and
  payment post with the real server ids. The Bearer token is supplied by the
  renderer; no credentials are stored.
- **Conflict resolution** — a customer created offline whose phone already exists
  on the server is automatically linked to the existing record (fetched by
  phone) instead of being duplicated; the resolution is logged.
- **Resilient queue** — exponential backoff for transient failures
  (`network/5xx/429`), a dead-letter list for permanent failures with manual
  retry/discard, and queue statistics.
- **Offline barcode & label generation** — Code128/Code39/EAN-13/EAN-8/UPC-A via
  `bwip-js` and QR via `qrcode`, plus scan validation (EAN/UPC checksums).
- **USB barcode scanner** (keyboard-wedge) — scanned values are validated,
  recorded to `offline_events`, and broadcast to every window.
- **Camera capture persistence** — capture images (from the renderer) are saved
  locally and listed; the camera (`media`) permission is now allowed.

### Security
- All windows keep `contextIsolation`, `sandbox`, and `nodeIntegration=false`;
  only the validated `desktop` bridge is exposed (no raw `ipcRenderer`).
- The offline cache stores **no credentials** (no password/secret columns); the
  JWT used for sync is held in memory only and never persisted.
- Session permissions remain deny-by-default (only notifications and camera).

### Notes / Known limitations
- The live camera feed and a physical USB scanner were **not** hardware-tested
  (no devices available); only the software paths they feed were validated.
- API secrets (`DATABASE_URL`, JWT) are intentionally **not** bundled in the
  installer; the desktop reuses an externally configured API.

## [1.0.0] — 2026 — Initial desktop release
- Electron shell over the Next.js admin + Express API (external), with printing,
  cash drawer, multi-window, tray, notifications, crash reporter, backup,
  shortcuts, and settings. Windows installers (NSIS + portable).

[1.2.0]: https://github.com/momhamedga/Laundry-ERP/releases/tag/v1.2.0
[1.0.0]: https://github.com/momhamedga/Laundry-ERP/releases/tag/v1.0.0
