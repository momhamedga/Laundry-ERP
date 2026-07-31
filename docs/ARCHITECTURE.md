# Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Electron Desktop (Windows)                                    │
│  ┌────────────────┐   IPC (contextBridge)   ┌───────────────┐ │
│  │  Renderer      │◄───────────────────────►│  Main process │ │
│  │  = Admin UI    │                         │  services +   │ │
│  │  (Next.js)     │                         │  SQLite       │ │
│  └───────┬────────┘                         └──────┬────────┘ │
└──────────┼─────────────────────────────────────────┼─────────┘
           │ HTTP (Bearer JWT)                        │ local, offline
           ▼                                          ▼
   ┌─────────────────┐                        ┌────────────────────┐
   │  API (Express)  │◄──── Prisma ──────────►│  Encrypted SQLite  │
   │  apps/api       │                        │  (SQLCipher)       │
   └───────┬─────────┘                        └────────────────────┘
           │
           ▼
   ┌─────────────────┐
   │ PostgreSQL/Neon │
   └─────────────────┘
```

## Design principles

- **Desktop → HTTP → API → PostgreSQL.** The desktop does **not** embed the API; it
  reuses an external (or bundled-and-spawned) API process. The renderer is the same
  Next.js Admin UI served locally.
- **Offline-first on the desktop.** All writes are captured locally in SQLite and
  replayed to the API by a background sync engine when connectivity returns.
- **No server changes for offline.** The offline layer maps to the *existing* API
  contracts; it never alters routes, DTOs, responses, or the database schema.

## API (`apps/api`)

- Express 5, modular (`src/modules/<name>/` with routes · controller · service ·
  repository · validator · dto). Prisma 6 over PostgreSQL.
- Auth: JWT access token (in-memory on the client) + refresh token (httpOnly cookie,
  rotated). RBAC via `requirePermission` / `requireRole` middleware.
- Standard response envelope: `{ success, data, message?, meta? }`.

## Admin (`apps/admin`)

- Next.js 16 (App Router) + React 19 + Tailwind. Built as a **standalone** server
  for packaging into the desktop app. Talks to the API over HTTP with the Bearer
  token held in memory.

## Desktop (`apps/desktop`)

Electron 33, `src/`:

- **`main/`** — app lifecycle, window management, tray, printing, cash drawer,
  backup, crash reporter, settings, shortcuts, network monitor, **sync engine**,
  **updater**, and the **`db/`** layer (encrypted SQLite + repositories).
- **`preload/`** — the single `contextBridge` surface (`window.desktop`). No raw
  `ipcRenderer` is exposed.
- **`shared/ipc.ts`** — the whitelisted IPC channel contract + shared types.

### Local database (16 tables)

`customers, orders, order_items, payments, employees, settings, sync_queue,
sync_log, offline_events, cached_{users,permissions,services,categories,inventory,
branches}, id_map`. WAL journal, foreign keys on, encrypted at rest (SQLCipher).

See [OFFLINE_MODE](OFFLINE_MODE.md) and [SYNC_ENGINE](SYNC_ENGINE.md) for detail.

## Data flow: an offline order

1. Operator creates an order → written to SQLite (`orders` + `order_items`),
   flagged `_dirty`, and an operation is enqueued in `sync_queue`.
2. Connectivity returns → the sync engine drains the queue FIFO, POSTs to the API,
   records the server id in `id_map`, and marks the local rows synced.
3. Dependent operations (payment → order) are remapped to the real server ids.
