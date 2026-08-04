# Administrator Guide

For administrators and branch managers.

## First-run

1. Sign in with the seeded admin (`##########` / `#######`) and
   **change the password immediately**.
2. Create your **branch(es)**, **service categories** and **services** (with
   prices), and **staff accounts** with appropriate roles.

## Roles (RBAC)

| Role | Typical capabilities |
|---|---|
| ADMIN | Full access, settings, users, security, audit |
| MANAGER | Branch operations, reports, staff |
| CASHIER | Orders, payments, customers |
| WORKER | Update order status |
| DELIVERY | Delivery/handover |

Permissions are enforced server-side; the UI mirrors them.

## Modules

- **Customers** — profiles, history, stats.
- **Orders** — full lifecycle, items, status, history.
- **Payments / Invoices** — record payments, generate invoices (PDF/QR/barcode).
- **Services & categories** — catalog and pricing.
- **Inventory / Suppliers / Purchases** — stock management.
- **Employees / HR** — attendance, leaves, payroll, documents.
- **Coupons / Loyalty / Membership** — promotions and retention.
- **Day closing** — end-of-day accounting.
- **Reports** — sales, operational, HR, security/audit.
- **Notifications** — in-app + email (SMS/WhatsApp/push are scaffolded).
- **Settings** — business, printing, backup, sync, security options.

## Desktop settings (per workstation)

Configured locally on each desktop (stored in the app's user-data folder):

- **Printers**: default, receipt, barcode, label printers + paper profile.
- **Cash drawer**: enable + host/port/pin (for networked receipt printers).
- **Camera**: device selection.
- **Backup**: daily/weekly/on-exit + retention days.
- **Sync**: enable + interval.
- **Startup / auto-update / theme / language / logging**.

## Backups

See [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.md). Note that desktop backups are
machine-bound (encrypted); the **server database is the source of truth** for
cross-machine recovery — back it up via your Postgres/Neon provider.

## Security administration

- Enforce password changes, review the **audit log** and **security reports**.
- Impersonation and permission overrides are available to ADMIN (audited).
- See [SECURITY](SECURITY.md) for the full posture.

## Updates

When packaged and published, the desktop app checks GitHub Releases for updates and
prompts the user to Download → Install & Restart. See [DEPLOYMENT](DEPLOYMENT.md).
