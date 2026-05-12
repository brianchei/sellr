# Sellr

Sellr is a trust-native local marketplace for verified communities. It is built
for places where proximity and identity matter, such as campuses, coworking
spaces, residential communities, and other invite- or domain-gated groups.

The product goal is to make local resale feel safer and easier from listing to
pickup: members join verified communities, publish listings with availability
and approximate location, search nearby inventory, make offers, coordinate
meetups, message each other, receive notifications, and build reputation through
completed transactions.

## Current Status

This repository now has a working web SLC MVP for the core
community-scoped buyer/seller loop. The app covers onboarding, browse/search,
listing detail, durable listing photo uploads, structured listing creation,
listing management/editing, sold-listing lifecycle, seller trust signals,
seller storefronts, buyer contact, inbox replies, notifications, basic
reporting, a restricted admin reports dashboard with explicit listing removal,
admin community setup, media lifecycle cleanup, and a seller readiness panel on
the dashboard.

The production web SLC is deployed and launch-ready for the initial campus
release. GitHub Actions CI and production migration checks are passing, the
Fastify API is deployed on Railway, the web app is deployed on Vercel, email OTP
is the primary launch sign-in path, Twilio remains available for phone fallback,
and durable R2-backed listing media plus media lifecycle cleanup have been
smoke-tested.
The current production origins are:

```text
Web: https://sellr-ai.com
API: https://api.sellr-ai.com
```

API health:

```text
https://api.sellr-ai.com/health
```

See [`docs/deployment.md`](docs/deployment.md) for the current production
topology, required environment variables, and post-deploy verification. See
[`docs/current-state-and-scope.md`](docs/current-state-and-scope.md) for the
current production state and launch scope,
[`docs/custom-domain-cutover.md`](docs/custom-domain-cutover.md) for the
Cloudflare/Vercel/Railway domain cutover guide,
[`docs/email-first-auth.md`](docs/email-first-auth.md) for the Resend email OTP
flow, and [`docs/next-session-context.md`](docs/next-session-context.md) for a
short handoff brief for continuing work in a new agent session.

## Repository Layout

```text
sellr/
+-- apps/
|   +-- api/       Fastify API, Prisma schema, BullMQ workers, integrations
|   +-- mobile/    Expo React Native app
|   +-- web/       Next.js App Router web app and seller dashboard scaffold
+-- packages/
|   +-- api-client/ Typed fetch helpers shared by web and mobile
|   +-- shared/     Domain types, enums, Zod validation schemas
|   +-- tsconfig/   Shared TypeScript config
+-- docker-compose.yml
+-- pnpm-workspace.yaml
+-- turbo.json
```

## Platform

- **Monorepo:** pnpm workspaces and Turborepo
- **API:** Node.js, Fastify, Zod, Prisma 7, Socket.IO
- **Database:** PostgreSQL/Supabase with PostGIS for location-aware listings
- **Jobs/cache:** Redis and BullMQ for search sync, notifications, saved
  searches, and AI pipeline placeholders
- **Search:** Algolia, scoped by community membership
- **Mobile:** Expo React Native with Expo Router
- **Web:** Next.js 16, React 19, Tailwind CSS 4
- **Shared contracts:** `@sellr/shared` and `@sellr/api-client`
- **Observability/integrations:** Sentry, PostHog, Langfuse, Resend, Twilio,
  Expo Push, OpenAI, Anthropic, and Cloudflare R2 listing media storage

## Key Capabilities

- Email-first OTP authentication on web, with phone OTP fallback and mobile
  tokens/web httpOnly cookies
- Verified community membership through invite codes or institutional email
  domains
- Production `Badger Market` community access through verified `wisc.edu`
  email or invite code `BADGER2026`
- Community-scoped listings with status, condition, pricing, photos,
  availability windows, and approximate neighborhood/radius location
- Web SLC listing photo uploads with JPG/PNG/WebP validation, local dev
  fallback, and durable R2/CDN production delivery
- Nearby listing lookup using PostGIS and full-text/product search through
  Algolia
- Seller storefront-lite pages with trust signals, active listings, and
  contact-through-listing guidance
- Buyer contact and pre-offer conversation flows for listing-specific messages
- Realtime-ready messaging through Socket.IO-backed API infrastructure
- Notifications for messages, listing lifecycle changes, marketplace activity,
  and pickup-sensitive updates
- Trust and safety primitives for reports, reputation, no-shows, late cancels,
  and safety flags
- Admin-only reports review at `/admin/reports` for community moderators
- Seller dashboard readiness panel for listing presence, photo quality, buyer
  activity, and next best actions

## Getting Started

Install dependencies:

```bash
pnpm install
```

Create local environment files:

```bash
cp .env.example .env
pnpm env:web
```

Start Redis:

```bash
docker compose up -d redis
```

Start the local Supabase database from the API app:

```bash
cd apps/api
supabase start
cd ../..
```

Run database migrations:

```bash
pnpm db:migrate
```

Seed local demo data:

```bash
pnpm --filter @sellr/api exec prisma db seed
```

Start the workspace:

```bash
pnpm dev
```

By default, the API listens on `http://localhost:3001`, the web app listens on
`http://localhost:3000`, and Expo serves the mobile app through its development
server.

## Local Demo Flow

The seed creates a `Dev Campus` community, enables `wisc.edu` email-domain
join, keeps invite code `DEV2026`, and creates demo listings, a buyer/seller
conversation, and a demo report. Local email/SMS OTP accepts `000000` when
providers are not configured. Use any `@wisc.edu` address to test the
email-first onboarding path locally; the seeded buyer/seller/admin fixtures
still use phone numbers for repeatable smoke scripts.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera
- Admin: `+15550000003` / Priya Shah

See `docs/slc-readiness.md` for the web SLC readiness checklist and
`docs/slc-smoke-test.md` for the detailed smoke path.

Key local routes:

- Buyer/seller app: `http://localhost:3000`
- Marketplace browse: `http://localhost:3000/marketplace`
- Seller storefront: `http://localhost:3000/sellers/<sellerId>`
- Admin reports: `http://localhost:3000/admin/reports`

## Useful Commands

```bash
pnpm dev          # run all dev servers through Turborepo
pnpm build        # build all packages/apps
pnpm lint         # lint all packages/apps
pnpm typecheck    # run TypeScript checks
pnpm test         # run tests
pnpm db:migrate   # run Prisma migrations for the API
pnpm db:deploy    # deploy committed Prisma migrations
pnpm db:studio    # open Prisma Studio for the API
pnpm env:web      # create/update apps/web/.env.local from root env values
pnpm smoke:seller # run seller lifecycle smoke check through the web proxy
pnpm smoke:buyer  # run buyer contact/inbox smoke check through the web proxy
pnpm smoke:web    # run authenticated web route smoke check
pnpm slc:ready    # run the full web SLC release readiness gate
pnpm --filter @sellr/api exec prisma db seed
```

## Realtime Deployment

The web app talks to Fastify over WebSocket (Socket.IO) for inbox/notification
freshness. Configuration is via env vars on the **web** client:

- `NEXT_PUBLIC_REALTIME_URL` — origin of the realtime endpoint. Set to a
  dedicated API subdomain in production (e.g. `https://api.example.com`),
  or to your own origin if a reverse proxy forwards `/socket.io/` to
  Fastify. Falls back to `NEXT_PUBLIC_API_URL`, then to
  `http://localhost:3001` in dev.
- `NEXT_PUBLIC_REALTIME_PATH` — Socket.IO mount path. Default
  `/socket.io`; override when a proxy mounts the websocket under a
  different prefix.

And on the **API** side:

- `SOCKET_IO_PATH` — must match `NEXT_PUBLIC_REALTIME_PATH` when a
  custom mount path is in use.
- `ALLOWED_ORIGINS` — comma-separated origin list for CORS and for the
  Socket.IO handshake; include the web app origin.

Vercel + a separate Fastify host is the simplest topology: point
`NEXT_PUBLIC_REALTIME_URL` at the Fastify host's public URL and leave
the path defaults alone. Same-origin proxying is also supported via any
reverse proxy that forwards the WebSocket upgrade for `/socket.io/`
(Nginx, Cloud Run, Caddy, Fly.io, etc.) — Next.js's own `rewrites` do
not forward WebSocket upgrades, so a real reverse proxy is required for
that topology.

## Production Deployment Snapshot

- GitHub `main` is protected and should be updated through pull requests.
- The production migration workflow in `.github/workflows/deploy.yml` runs
  `pnpm db:deploy` against Supabase using GitHub Actions secrets.
- The API service is deployed on Railway and currently starts with
  `tsx src/index.ts`. This avoids the Prisma 7 generated-client runtime issue
  that occurred when running the compiled `dist/index.js` output directly.
- Railway API variables must include full Supabase `DATABASE_URL`/`DIRECT_URL`,
  a full Redis URL in `REDIS_URL`, `JWT_SECRET`, Resend email OTP variables for
  primary web sign-in, and Cloudflare R2 variables for durable listing media.
  Twilio Verify variables are still used for the phone sign-in fallback.
- `NO_CACHE=1` was only a one-time Railway cache repair flag. Remove it after a
  successful clean deploy.
- The web app should call same-origin `/api/v1` in the browser. For Vercel,
  set `INTERNAL_API_URL` to `https://api.sellr-ai.com` and keep
  `NEXT_PUBLIC_USE_SAME_ORIGIN_API=1`; do not set `NEXT_PUBLIC_API_URL` for the
  normal cookie-auth web flow.
- The Vercel web project should also set `NEXT_PUBLIC_SITE_URL` to
  `https://sellr-ai.com`, `NEXT_PUBLIC_REALTIME_URL` to
  `https://api.sellr-ai.com`, and `NEXT_PUBLIC_LISTING_IMAGE_CDN_URL` to the
  public R2/CDN origin used by `CLOUDFLARE_CDN_URL`.
- New listing images should return R2/CDN URLs. Legacy same-origin image URLs
  are still served by the API for compatibility.
- Media cleanup tracks uploaded assets, attaches them to listings, queues
  deletion for abandoned/replaced/deleted listing images, and supports explicit
  admin listing removal from reports.

## API Integration Tests

The API has unit tests plus an integration suite under `apps/api/tests/integration/`
that boots the real Fastify app, hits a real Postgres database, and mocks Redis,
BullMQ queues, Twilio, Expo Push, and Socket.IO emit. The suite **truncates every
domain table between tests**, so it refuses to run unless the database name
clearly identifies a test DB (must contain `test`).

To run them locally against a dedicated test DB:

```bash
# 1. Create a separate test DB on the local Supabase Postgres cluster
docker exec supabase_db_api psql -U postgres -d postgres \
  -c "CREATE DATABASE sellr_integration_test"

# 2. Apply Prisma migrations to it
cd apps/api && \
  DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/sellr_integration_test' \
  DIRECT_URL='postgresql://postgres:postgres@127.0.0.1:54322/sellr_integration_test' \
  pnpm exec prisma migrate deploy
cd ../..

# 3. Run tests pointing at the test DB
TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/sellr_integration_test' \
  pnpm test
```

In CI the `DATABASE_URL` already points at a `sellr_test` Postgres service, so
no extra opt-in is required.

## Documentation

The detailed implementation baseline lives in
`sellr-technical-implementation-guide-v2.md`. It documents the Phase 0
architecture, local setup expectations, infrastructure decisions, and planned
next phases. The web visual direction is documented in
`docs/design-language.md`; deployment is documented in `docs/deployment.md`;
SLC readiness is documented in `docs/slc-readiness.md`; the detailed smoke
checklist is documented in `docs/slc-smoke-test.md`; production operations are
documented in `docs/production-runbook.md`; and the current handoff brief is
documented in `docs/next-session-context.md`.
