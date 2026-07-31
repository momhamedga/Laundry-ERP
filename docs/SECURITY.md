# Security

This document describes the security posture as implemented and **measured** in
v1.3.0. Items that were not verifiable in the build environment are marked.

## Authentication & authorization (API)

- **JWT** access tokens (short-lived) + **refresh tokens** as httpOnly cookies with
  rotation. The refresh cookie is scoped to `/api/v1/auth`.
- Passwords hashed with **bcrypt**. Login rate-limiting + account lockout after
  repeated failures (`failedLoginAttempts` / `lockedUntil`).
- **RBAC**: roles ADMIN / MANAGER / CASHIER / WORKER / DELIVERY, enforced by
  `requirePermission` / `requireRole` middleware.

## Electron hardening (desktop)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` on **every**
  window (main, extra windows, splash). *(Verified in source.)*
- Only a **validated `window.desktop` bridge** is exposed — no raw `ipcRenderer`.
  Every IPC handler is wrapped to return a typed result and validates its payload;
  channels are whitelisted in `shared/ipc.ts`.
- **Navigation lock**: `window.open` denied (http/https opened in the OS browser),
  off-origin `will-navigate` blocked, `<webview>` attachment blocked.
- **Content-Security-Policy** injected on the renderer session: `script-src` and
  `connect-src` restricted to local origins; `object-src`/`frame-ancestors` denied.
  *(Behaviorally verified: inline scripts run; an external script is refused.)*
- Session permissions are deny-by-default; only `notifications` and `media` (camera)
  are allowed.

## Data at rest (desktop)

- The local SQLite database is **encrypted with SQLCipher** (via
  `better-sqlite3-multiple-ciphers`). *(Verified: the raw file is not a plaintext
  SQLite database and customer data is absent from the raw bytes.)*
- The 256-bit key is generated once and **sealed with the OS keystore** — Electron
  `safeStorage`, which uses **DPAPI on Windows**. The raw key is never written to
  disk when a keystore is available. *(Verified: opening without/with a wrong key
  fails; the sealed key round-trips.)*
- The **offline cache stores no credentials** (no password/secret columns).
- The JWT used by the sync engine is held **in memory only** and never persisted.

## Secrets & configuration

- API secrets live in `apps/api/.env` (git-ignored, **not** tracked). They are
  **not** bundled into the desktop installer by design.
- No hardcoded secrets, weak crypto (md5/sha1), or `console.log` leakage in the
  desktop source. *(Verified by static audit.)*

## Injection / traversal

- SQLite access uses **bound parameters**; the only interpolated identifiers are
  compile-time-constrained unions / whitelisted table maps. No SQL injection surface.
- Child processes are spawned as `spawn(execPath, [fixed entry])` — no shell, no
  user input. No `eval`/`exec` on user data.
- File paths from the renderer are sanitized (camera capture) or whitelisted (backup
  restore) — no directory traversal surface found.

## Known gaps / follow-ups (honest)

- **Encrypted backup portability**: because the key is DPAPI-sealed to the Windows
  user/machine, an encrypted backup restores on the **same** user/machine. Cross-
  machine restore would need a passphrase-based export (not implemented).
- **CSP under the real UI** was validated behaviorally (external script blocked) but
  the full Admin UI was **NOT VERIFIED** rendering under CSP in a headless
  environment.
- **Code signing**: the Windows installer is not code-signed in the current build
  environment. Production distribution should sign the installer with an EV/OV
  certificate.

## Reporting a vulnerability

Email the maintainer (see repository) with details and reproduction steps. Do not
open public issues for security reports.
