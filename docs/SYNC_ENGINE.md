# Sync Engine

The sync engine (`apps/desktop/src/main/services/sync-engine.ts`) drains the local
`sync_queue` and replays each captured offline write against the **existing** API.
It never changes API contracts.

## Triggers

- **On reconnect** — the `offline → online` network transition.
- **Periodic** — every `settings.sync.intervalSec` seconds (when enabled).
- **Manual** — from the UI (`desktop.offline.sync.now()`).

Authentication: the renderer supplies the current Bearer token
(`desktop.offline.sync.setAuth(token)`). The engine stores **no** credentials.

## Processing

1. `takePending()` selects `pending` operations that are due (respecting backoff),
   oldest first (FIFO).
2. Each operation is mapped to a real API call:
   - `customer:create` → `POST /customers`
   - `customer:update` → `PATCH /customers/:id`
   - `order:create` → `POST /orders` (with `receivedAt`/`dueDate`, items carry
     `serviceId`/`quantity`/`discount`; the server derives price)
   - `payment:create` → `POST /payments`
3. **Id remapping.** Local ids are resolved via `id_map`; a `local_…` id is replaced
   by the server id recorded when its parent synced. So an offline customer's order
   posts with the real `customerId`, and its payment with the real `orderId`.
4. On success: the server id is written to `id_map`, the local row is marked
   `_dirty = 0 / _synced_at`, and the queue row is `done`. Every result is logged to
   `sync_log`.

## Retry & backoff

- Transient failures (network, `408/425/429/5xx`) → the operation stays `pending`
  with **exponential backoff**: next attempt at `now + min(5·2^attempts, 300)` s, up
  to 6 attempts. `takePending()` skips operations still inside their backoff window.
- Permanent failures (`4xx`) → `failed` (dead-letter).

## Conflict resolution

- **Duplicate customer** (phone already exists on the server → `409`): the engine
  fetches the existing customer via `GET /customers/phone/:phone` and **links** the
  local record to it (records the mapping, marks synced) instead of duplicating.
  Dependent orders/payments then use the existing server id.
- Other `409` conflicts are logged and surfaced to the dead-letter list for manual
  resolution.

## Dead-letter management

`desktop.offline.queue.*` exposes: `failed()`, `retry(id)`, `retryAll()`,
`discard(id)`, `stats()`. Failed operations can be retried (reset to pending) or
discarded (cancelled).

## Validation status (measured)

Verified end-to-end against the **live API + Neon**: offline customer + order +
payment synced (3/3), verified by reading the records back from Postgres; a live
duplicate customer was linked to the existing record. Retry/backoff and dead-letter
behavior were verified against a contract-faithful local stub.
