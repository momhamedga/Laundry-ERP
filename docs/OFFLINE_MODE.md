# Offline Mode

The **order-taking path** keeps working with no internet and syncs automatically
when the connection returns. Most other screens need the cloud database and say
so plainly when it is unreachable.

This is deliberate: a laundry must never stop taking orders because the internet
dropped, but reports and administration can wait until it is back.

## What works offline

| Area | Offline | Notes |
|---|---|---|
| **Licence activation / validation** | ✅ | fully local (RSA); never needs a network at any point |
| **Customer lookup** | ✅ | reads the local table, seeded from the server while online |
| **Service catalogue + prices** | ✅ | read cache, refreshed on login and on reconnect |
| **Branches** | ✅ | read cache |
| **Create order (+ items, totals)** | ✅ | written locally, queued, and uploaded on reconnect |
| **Record payment** | ✅ | queued as `PENDING`; the server confirms it on sync |
| **Create / edit customer** | ✅ | queued |
| **Login** | ❌ | needs the cloud database. An **already-signed-in** session keeps working; if the app is closed while offline, signing in again is not possible |
| Orders list / order details | ❌ | database required |
| Dashboard, reports, invoices | ❌ | database required |
| Users, settings, backup, HR, inventory | ❌ | database required |

Verified on a real machine (v2.1.6): an order and a payment created with the
network down, then uploaded automatically on reconnect — `processed=2 done=2`,
with no duplicates and no lost data.

### Offline order numbers

An order created offline has **no order number** until it syncs. Numbering is
central to the server; a locally invented number would collide with numbers
issued to other devices. `id_map` links the local id to the server one.

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

A background monitor calls the local API's `/health` every five seconds. That
endpoint runs `SELECT 1` against the cloud database, so what is measured is
**"can we reach the database"** — not "is there Wi-Fi". A laptop attached to a
router with no internet is correctly reported as offline.

On the `offline → online` transition the sync engine runs automatically (see
[SYNC_ENGINE](SYNC_ENGINE.md)), and the read caches refresh.

## Operator expectations

- You can look up customers, create orders, and take payments with **no internet**.
- When the connection returns, everything uploads automatically; you don't need to
  do anything.
- A **desktop notification** appears when the connection is lost.
- If an item **can't** sync (e.g. a server validation conflict), it moves to a
  **dead-letter** list, reachable through the offline queue IPC channels.

> **No in-app sync indicator yet.** The queue status is available over IPC
> (`offline.queue.stats`) but no screen renders it, so pending items are visible
> only in the log. Documented here rather than implied to exist.

## Limits & honest notes

- Offline covers the POS-critical entities (customers/orders/payments). Employee
  management and server-side settings require a connection.
- Because the local DB is **encrypted with a machine-bound key**, the offline data
  and its backups are readable only on the same Windows user/machine.
