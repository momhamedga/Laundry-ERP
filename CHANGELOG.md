# Changelog

All notable changes to the Laundry ERP desktop application are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this
project adheres to [Semantic Versioning](https://semver.org/).

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
