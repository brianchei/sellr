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

This repository is moving from the Phase 0 foundation into a web SLC MVP. The
backend domain model and API surface are in place for auth, communities,
listings, search, offers, meetups, conversations, reports, and notifications.
The web app now covers the core community-scoped buyer/seller loop: onboarding,
browse, structured listing creation, listing management/editing, seller trust
signals, buyer contact, inbox replies, basic reporting, and sold-listing
lifecycle, with a restricted admin reports dashboard for reviewing trust and
safety reports.

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
- Nearby listing lookup using PostGIS and full-text/product search through
  Algolia
- Offer, counter, accept, decline, meetup, and post-acceptance conversation
  flows
- Realtime-ready messaging through Socket.IO-backed API infrastructure
- Notifications for offers, messages, meetups, ratings, matches, and saved
  searches
- Trust and safety primitives for reports, reputation, no-shows, late cancels,
  and safety flags
- Admin-only reports review at `/admin/reports` for community moderators

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
and one buyer/seller conversation. Local OTP accepts `000000`.

- Seller: `+15550000001`
- Buyer: `+15550000002`
- Admin: `+15550000003`

See `docs/slc-readiness.md` for the web SLC readiness checklist and
`docs/slc-smoke-test.md` for the detailed smoke path.

## Useful Commands

```bash
pnpm dev          # run all dev servers through Turborepo
pnpm build        # build all packages/apps
pnpm lint         # lint all packages/apps
pnpm typecheck    # run TypeScript checks
pnpm test         # run tests
pnpm db:migrate   # run Prisma migrations for the API
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
