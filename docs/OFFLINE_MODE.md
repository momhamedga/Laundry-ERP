# Offline Mode

The desktop app is **offline-first**: it keeps working with no internet and syncs
automatically when the connection returns.

## What works offline

| Entity | Offline create / edit | Notes |
|---|---|---|
| Customers | ✅ create, update | captured to the sync queue |
| Orders (+ items) | ✅ create | totals computed locally |
| Payments | ✅ record | updates the order's paid amount / status |
| Read caches | ✅ read | services, categories, users, permissions, inventory, branches, populated from the server while online |
| Employees / server settings | ❌ | **not** available offline (admin/config entities; edit while online) |

## How it works

1. **Local database.** All data lives in an **encrypted SQLite** database in the
   app's user-data folder (16 tables; WAL; foreign keys). See
   [ARCHITECTURE](ARCHITECTURE.md).
2. **Local-first writes.** Every offline write sets `_dirty = 1` and appends an
   operation to `sync_queue` (create/update per entity) — atomically, in one
   transaction with the row itself.
3. **Local ids.** Offline-created records get a temporary `local_…` id. When the
   record syncs, the server id is stored in `id_map` and used for dependents.
4. **Read caches.** While online, reference data (services, prices, categories,
   users/permissions, branches, inventory) is cached locally so the POS can operate
   fully offline.

## Network detection

A background network monitor watches connectivity to the local API. On the
`offline → online` transition the sync engine runs automatically (see
[SYNC_ENGINE](SYNC_ENGINE.md)). Status is surfaced to the UI and the tray.

## Operator expectations

- You can create customers, orders, and take payments with **no internet**.
- A **sync indicator** shows pending items and sync status.
- When the connection returns, everything uploads automatically; you don't need to
  do anything.
- If an item **can't** sync (e.g. a server validation conflict), it moves to a
  **dead-letter** list you can review, retry, or discard.

## Limits & honest notes

- Offline covers the POS-critical entities (customers/orders/payments). Employee
  management and server-side settings require a connection.
- Because the local DB is **encrypted with a machine-bound key**, the offline data
  and its backups are readable only on the same Windows user/machine.
