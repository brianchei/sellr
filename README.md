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
listing detail, file-based listing photo uploads, structured listing creation,
listing management/editing, sold-listing lifecycle, seller trust signals,
seller storefronts, buyer contact, inbox replies, notifications, basic
reporting, a restricted admin reports dashboard, and a seller readiness panel on
the dashboard.

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
- **Observability/integrations:** Sentry, PostHog, Langfuse, Twilio, Expo Push,
  OpenAI, Anthropic, and Cloudflare R2 configuration hooks

## Key Capabilities

- Phone-first OTP authentication with mobile tokens and web httpOnly cookies
- Verified community membership through invite codes or institutional email
  domains
- Community-scoped listings with status, condition, pricing, photos,
  availability windows, and approximate neighborhood/radius location
- Local web SLC listing photo uploads with JPG/PNG/WebP validation and preview
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

The seed creates a `Dev Campus` community, invite code `DEV2026`, demo listings,
a buyer/seller conversation, and a demo report. Local OTP accepts `000000`.

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

## Documentation

The detailed implementation baseline lives in
`sellr-technical-implementation-guide-v2.md`. It documents the Phase 0
architecture, local setup expectations, infrastructure decisions, and planned
next phases. The web visual direction is documented in
`docs/design-language.md`; SLC readiness is documented in
`docs/slc-readiness.md`; and the detailed smoke checklist is documented in
`docs/slc-smoke-test.md`.
