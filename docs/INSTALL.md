# Installation

## Prerequisites

- **Node.js ≥ 20** and **pnpm ≥ 9**
- **PostgreSQL** database (the project targets [Neon](https://neon.tech); any Postgres 14+ works)
- **Windows 10/11 x64** for the desktop app
- For rebuilding native modules from source (only if no prebuilt is available):
  Python 3 + Visual Studio Build Tools. Prebuilt binaries are fetched automatically
  by `@electron/rebuild`, so build tools are usually **not** required.

## 1. Clone & install

```bash
git clone https://github.com/momhamedga/Laundry-ERP.git
cd Laundry-ERP
pnpm install
```

`pnpm-workspace.yaml` uses an `allowBuilds` whitelist for native packages
(`better-sqlite3`, `better-sqlite3-multiple-ciphers`, `bcrypt`, `prisma`, …).

## 2. Configure the API

Copy `apps/api/.env.example` → `apps/api/.env` and set at least:

```
DATABASE_URL="postgresql://…"     # Neon/Postgres connection string
JWT_ACCESS_SECRET="…"             # long random string
JWT_REFRESH_SECRET="…"            # long random string (different)
```

See [DEPLOYMENT](DEPLOYMENT.md) for the complete environment variable list.

## 3. Database

```bash
pnpm --filter @laundry/api exec prisma migrate deploy   # apply migrations
pnpm --filter @laundry/api exec prisma generate          # generate client
pnpm --filter @laundry/api exec tsx prisma/seed.ts       # create admin user
```

## 4. Run (development)

```bash
pnpm --filter @laundry/api dev       # API   → http://127.0.0.1:4000
pnpm --filter @laundry/admin dev     # Admin → http://localhost:3000
pnpm --filter @laundry/desktop dev   # Desktop (Electron)
```

## 5. Build (production artifacts)

```bash
pnpm --filter @laundry/api build              # dist/server.js
pnpm --filter @laundry/admin build            # .next/standalone
pnpm --filter @laundry/desktop build          # dist/ (main + preload)
# Package the Windows desktop app:
pnpm --filter @laundry/desktop exec node scripts/prepare-resources.mjs
pnpm --filter @laundry/desktop exec electron-builder --win   # NSIS + portable
```

> **Note:** building the NSIS/portable installer requires reliable access to the
> electron-builder tool cache (winCodeSign/nsis) and, on Windows, Developer Mode or
> administrator rights for symlink extraction. The **unpacked** app
> (`electron-builder --dir`) builds without these. See [ROADMAP](ROADMAP.md).

## Verify

```bash
curl http://127.0.0.1:4000/api/v1/health     # → {"success":true,...}
```
