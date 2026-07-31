# Version History, Limitations & Roadmap

## Version history

| Version | Theme | Highlights |
|---|---|---|
| **v1.3.0** | Security & Reliability Hardening | SQLite encryption at rest (DPAPI-sealed key), CSP, auto-update (electron-updater + GitHub), richer crash analytics, **fix:** backups include the offline DB |
| **v1.2.0** | Enterprise Offline Edition | Local SQLite, offline repositories, background sync engine, conflict resolution, backoff + dead-letter, offline barcode/label, USB scanner, camera capture |
| **v1.0.0** | Initial desktop release | Electron shell over Admin + API, printing, cash drawer, multi-window, tray, notifications, crash reporter, backup, shortcuts, settings |

See [CHANGELOG](../CHANGELOG.md) for details.

## Breaking changes

- **v1.3.0**: the local SQLite database is now **encrypted**. On first launch after
  upgrade, an existing plaintext DB that can't be decrypted is backed up to
  `laundry-offline.db.legacy-<timestamp>` and a fresh encrypted DB is created.
  Unsynced local data in the old file remains in the `.legacy` copy. **Sync before
  upgrading** to avoid this. No server/API/schema breaking changes.

## Migration / upgrade guide

- **Server/API**: no schema or contract changes across v1.0.0 → v1.3.0. Standard
  `prisma migrate deploy` applies any pending migrations.
- **Desktop**: install the new version over the old one. Encrypted-DB migration is
  automatic (see above). Verify pending items are synced first.

## Known limitations (honest, current)

1. **Installers are not code-signed** — NSIS + portable now build successfully
   (`pnpm --filter @laundry/desktop package:win`, which runs
   `scripts/prepare-wincodesign.mjs` first), and the exe carries correct
   ProductName/Company/Version/icon. But without an OV/EV certificate Windows
   SmartScreen still warns on first run. Configure `win.signtoolOptions` to sign.
2. **Auto-update assets not published yet** — `latest.yml` is now produced by the
   build, but no GitHub Release has the installer + `latest.yml` attached, so
   end-to-end update *delivery* remains unverified (the electron-updater → GitHub
   path itself is verified).
3. **Hardware not tested** — thermal/A4/label printers, USB scanner, cash drawer, and
   live camera capture require on-site devices. Software paths are verified.
4. **Authenticated UI screens not visually QA'd** — the login screen has been
   inspected; the rest require a manual pass on screen.
5. **Encrypted backups are machine-bound** (DPAPI). Cross-machine restore needs a
   passphrase-based export (not implemented).
6. **Offline scope** covers customers/orders/payments; employees and server settings
   require connectivity.
7. **Deep pagination / newest-first listing at very large scale** — measured on a
   1M-order local DB: an indexed lookup is 0.13 ms and a 1M-row aggregate 216 ms,
   but `ORDER BY created_at DESC LIMIT 50` is ~333 ms and `OFFSET 500000` ~1.4 s
   (no index on `created_at`). Not a concern at pilot volumes; revisit with an
   index + keyset pagination before multi-year datasets.
8. **Uninstall leaves cosmetic remnants** — an empty install directory and the
   `.laundry`/`.invoice`/`.receipt`/`laundry-erp` extension keys (their ProgIDs
   are removed). No functional impact.

## Future roadmap (candidate, non-committal)

- Produce and **code-sign** Windows installers in CI; publish auto-update assets.
- **On-site hardware certification** matrix (printers/scanner/cash drawer/camera).
- **Portable encrypted backup** (passphrase export) for cross-machine restore.
- **Keyset pagination** for very large lists (avoid deep OFFSET cost).
- Optional **offline coverage** for additional entities if required by customers.
- Formal **SMS/WhatsApp/push** providers (currently scaffolded).

> These are candidates, not commitments. The strict rules of the current phase
> (no new features, no schema/API changes) remain in force until explicitly lifted.
