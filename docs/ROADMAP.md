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

1. **Windows installer not built in the current build environment** — the NSIS/
   portable build stalls at the winCodeSign/electron-unpack stage; the **unpacked**
   app builds and boots. A proper build machine (Developer Mode/admin + reliable
   tool-cache access) is required to produce and sign installers.
2. **Auto-update has no published assets yet** — because the installer isn't built/
   published, releases lack `latest.yml` + installer artifacts, so end-to-end update
   delivery is unverified (the electron-updater → GitHub path itself is verified).
3. **Hardware not tested** — thermal/A4/label printers, USB scanner, cash drawer, and
   live camera capture require on-site devices. Software paths are verified.
4. **Visual UI/UX QA not automated** — must be done on screen.
5. **Encrypted backups are machine-bound** (DPAPI). Cross-machine restore needs a
   passphrase-based export (not implemented).
6. **Offline scope** covers customers/orders/payments; employees and server settings
   require connectivity.

## Future roadmap (candidate, non-committal)

- Produce and **code-sign** Windows installers in CI; publish auto-update assets.
- **On-site hardware certification** matrix (printers/scanner/cash drawer/camera).
- **Portable encrypted backup** (passphrase export) for cross-machine restore.
- **Keyset pagination** for very large lists (avoid deep OFFSET cost).
- Optional **offline coverage** for additional entities if required by customers.
- Formal **SMS/WhatsApp/push** providers (currently scaffolded).

> These are candidates, not commitments. The strict rules of the current phase
> (no new features, no schema/API changes) remain in force until explicitly lifted.
