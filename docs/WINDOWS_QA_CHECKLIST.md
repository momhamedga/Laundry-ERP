# Windows Desktop QA Checklist

Run on a clean Windows 10/11 x64 machine with the target hardware attached. Mark
each **PASS/FAIL** with the date, tester, and notes. Do **not** mark PASS unless
actually observed.

## Installation
- ☐ Installer runs; choose install directory.
- ☐ Desktop shortcut created and launches the app.
- ☐ Start Menu entry created.
- ☐ File associations (.laundry/.invoice/.receipt) open the app.
- ☐ Portable build runs without installation.

## Upgrade / Repair / Uninstall
- ☐ Installing a newer version over an older one preserves user data (DB, settings).
- ☐ Repair reinstalls without data loss.
- ☐ Uninstall removes the app; confirm the intended handling of user data/backups.

## Auto-update
- ☐ App detects a newer GitHub Release.
- ☐ Download progress shown; Install & Restart works.

## Launch / lifecycle
- ☐ Splash → main window.
- ☐ Login / logout.
- ☐ Minimize, restore, close-to-tray behaviors.
- ☐ Tray menu actions (open, new order, print queue, backup, quit).
- ☐ Multiple windows (POS / reports / customer) open and focus correctly.
- ☐ Clean shutdown (no orphaned processes; DB closed).

## Offline / Sync
- ☐ Disconnect network → create customer, order, payment.
- ☐ Offline banner / sync indicator reflects state.
- ☐ Reconnect → items auto-sync; pending count returns to 0.
- ☐ Duplicate-customer conflict links to the existing record.
- ☐ Dead-letter: force a failure, then retry and discard.

## Data / Backup
- ☐ SQLite database is encrypted at rest (file is not a plaintext SQLite DB).
- ☐ Manual backup runs; scheduled backup runs.
- ☐ Restore brings back customers/orders/payments (same machine).

## Hardware
- ☐ Thermal/receipt printer — silent print.
- ☐ Cash drawer — opens on payment/print.
- ☐ A4 printer — invoice print + preview dialog.
- ☐ Label printer — barcode label prints and scans back correctly.
- ☐ USB barcode scanner — scan populates/looks up.
- ☐ Camera — capture and attach.

## Notifications / Crash recovery
- ☐ Native notifications appear (backup done, sync, connection changes).
- ☐ Force a renderer/main crash → crash report written with breadcrumbs; app recovers.

---

### Automated coverage already measured (headless, no hardware)
- Encrypted DB init + integrity + FK + 10k/100k performance — **verified**.
- Offline create → backup → restore → restart persistence — **verified**.
- CSP enforcement (external script refused) — **verified**.
- Sync + conflict resolution — **verified** (live API + Neon).

### Already verified by automation (silent install on a real machine)
- Installer builds (NSIS + portable) and installs silently; exe metadata reads
  ProductName "Laundry ERP" / Company "Laundry ERP" / version 1.3.0 with the
  branded icon.
- Desktop + Start Menu shortcuts created; uninstall registry entry present;
  `.laundry` / `.invoice` / `.receipt` / `laundry-erp` associations registered.
- Installed app boots: encrypted SQLite (16 tables), CSP hardened.
- Reinstall over an existing install preserves user data (identical DB hash).
- Uninstall removes program files, shortcuts and the registry entry; user data is
  intentionally retained.

### Not covered by automation (must be done here)
- All hardware rows — **NOT TESTED** (no devices in the build environment).
- **Interactive** installer UI (wizard pages, custom install directory), repair
  flow, and a true version-to-version upgrade (1.3.0 → 1.3.1) — **NOT VERIFIED**
  (only silent same-version install/overwrite was automated).
- SmartScreen behaviour — **NOT VERIFIED**; expect a warning until the installer
  is code-signed.
- Visual UI/UX of authenticated screens (spacing, RTL, dark/light, dialogs, focus)
  — **NOT VERIFIED**; only the login screen has been inspected.
