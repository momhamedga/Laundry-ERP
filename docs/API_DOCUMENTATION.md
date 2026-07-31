# API Documentation

REST API, base path **`/api/v1`**. All responses use the envelope:

```json
{ "success": true, "data": { ... }, "message": "optional", "meta": { ... } }
```

Errors: `{ "success": false, "message": "..." }` with an appropriate HTTP status.

Authentication: `Authorization: Bearer <accessToken>` on protected routes. The
refresh token is an httpOnly cookie scoped to `/api/v1/auth`.

> This is a high-level reference. The authoritative contract is the route +
> validator + DTO files under `apps/api/src/modules/<name>/`.

## Auth (`/auth`)

| Method | Path | Body / notes |
|---|---|---|
| POST | `/login` | `{ email, password }` → `{ user, accessToken, expiresInSec }` (+ refresh cookie) |
| POST | `/refresh` | rotates the refresh cookie, returns a new access token |
| POST | `/logout` | clears the session |
| GET | `/me` | current user (auth) |
| GET | `/sessions` | list sessions (auth) |

## Customers (`/customers`)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | list (search/paginate) |
| POST | `/` | `{ name, phone, email?, address?, notes? }` |
| GET | `/:id` | by id |
| GET | `/phone/:phone` | lookup by phone (used by offline conflict resolution) |
| PATCH | `/:id` | update |
| DELETE | `/:id` | soft delete (ADMIN/MANAGER) |
| GET | `/:id/stats`, `/:id/profile` | analytics |

## Orders (`/orders`)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | list |
| POST | `/` | `{ customerId, branchId?, receivedAt, dueDate, discount?, items:[{serviceId, quantity, discount?, notes?}] }` (server computes prices/totals/orderNumber) |
| GET | `/:id`, `/number/:orderNumber` | fetch |
| PATCH | `/:id`, `/:id/status` | update / change status |
| GET | `/:id/history` | status history |

## Payments (`/payments`)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | list |
| POST | `/` | `{ orderId, amount, method }` |
| GET | `/:id`, `/:id/receipt`, `/:id/receipt/pdf` | fetch / receipt |

## Other modules

Mounted under `/api/v1`: `users`, `service-categories`, `services`, `invoices`,
`branches`, `coupons`, `loyalty`, `membership`, `inventory`, `suppliers`,
`purchases`, `employees`, `hr`, `day-closing`, `reports`, `stats`, `notifications`,
`settings`, `admin`, `barcode`, `backup`, `email`, `health`. Each follows the same
envelope and RBAC conventions; see the corresponding `*.routes.ts`.

## Conventions

- **RBAC**: routes are guarded by `requirePermission(...)` / `requireRole(...)`.
- **Validation**: request bodies validated with Zod; invalid input → `400` with a
  validation message.
- **IDs**: cuid strings. Money fields are decimals.
