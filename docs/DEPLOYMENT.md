# Deployment

Three deployable units: **API**, **Admin**, **Desktop**. The desktop app can bundle
the API + Admin to run locally, or point at a centrally hosted API.

## 1. Database (PostgreSQL / Neon)

1. Provision a Postgres database (Neon or self-hosted 14+).
2. Set `DATABASE_URL` in `apps/api/.env`.
3. Apply migrations: `pnpm --filter @laundry/api exec prisma migrate deploy`.
4. Seed the admin user: `pnpm --filter @laundry/api exec tsx prisma/seed.ts`.

## 2. Environment variables (API)

Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | signs access tokens (long random) |
| `JWT_REFRESH_SECRET` | signs refresh tokens (long random, different) |

Common optional (see `apps/api/src/config/env.ts` for the authoritative list and
defaults): `PORT` (default 4000), `NODE_ENV`, CORS origins, cookie/SSL flags, email
provider keys (Resend) for notifications. Set only what you use.

> Keep `.env` out of version control (it is git-ignored) and out of the desktop
> installer.

## 3. API

```bash
pnpm --filter @laundry/api build      # → apps/api/dist/server.js
node apps/api/dist/server.js          # or run under a process manager / service
```

Run behind a reverse proxy (nginx/Caddy) with **HTTPS** in production. Health check:
`GET /api/v1/health`.

## 4. Admin (web)

```bash
pnpm --filter @laundry/admin build    # Next.js standalone → apps/admin/.next/standalone
node apps/admin/.next/standalone/apps/admin/server.js
```

Serve behind HTTPS. Configure the API base URL the admin talks to per your hosting.

## 5. Desktop (Windows)

```bash
# Prepare bundled resources (flattens API + Admin standalone into resources/)
pnpm --filter @laundry/desktop exec node scripts/prepare-resources.mjs
pnpm --filter @laundry/desktop build
pnpm --filter @laundry/desktop exec electron-builder --win   # NSIS + portable
```

Outputs to `apps/desktop/release/`. See [WINDOWS_QA_CHECKLIST](WINDOWS_QA_CHECKLIST.md).

**Auto-update:** `electron-builder.yml` publishes to GitHub Releases
(`momhamedga/Laundry-ERP`). For updates to be delivered, each release must include
the installer artifacts **and** `latest.yml` (produced by a successful
`electron-builder` publish). See [ROADMAP](ROADMAP.md) for the current build caveat.

## 6. TLS / SSL

- API and Admin **must** be served over HTTPS in production (tokens + cookies).
- Use a reverse proxy for TLS termination and HSTS.

## 7. Monitoring & backups

- API: monitor `GET /api/v1/health`, process uptime, and DB connectivity.
- Desktop: local scheduled backups (see [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.md));
  the authoritative data is the synced server database — back that up per your
  Postgres/Neon provider's tooling.

## Deployment validation status (measured)

- API + Neon: live health `200`, admin login OK, live sync E2E verified.
- Desktop: unpacked package boots, encrypted DB initializes (16 tables).
- **NOT VERIFIED in this environment:** signed NSIS installer build; centrally
  hosted multi-branch deployment.
