# Sellr Agent Instructions

## Product Direction
Sellr is a trust-native local marketplace for verified, high-trust communities.
It is optimized for local peer-to-peer resale where identity, proximity,
availability, and pickup coordination matter.

Current priority is the web SLC/MVP: the smallest complete buyer/seller
experience that feels usable, polished, and trustworthy.

## Scope Discipline
Prioritize complete core flows over broad feature coverage. Defer payments,
advanced AI, native mobile polish, complex moderation, ratings, delivery and
logistics, advanced admin features, and marketplace growth loops unless
explicitly requested.

## SLC Definition
Included features must be Simple, Lovable, and Complete:
- Simple: minimal scope and clear UX.
- Lovable: polished enough to feel better than a generic listing board.
- Complete: working happy path, validation, loading/empty/error states,
  responsive design, and no dead-end UI.

## Core MVP Bias
Prefer work that improves:
- Listing creation and listing quality
- Browse/search/filter discovery
- Listing detail clarity
- Seller contact/message intent
- Basic trust/safety signals
- Responsive web usability

## Repository Map
- `apps/web`: Next.js 16 App Router web app and seller dashboard scaffold.
- `apps/api`: Fastify API, Prisma 7 schema/client, BullMQ workers, Socket.IO.
- `apps/mobile`: Expo React Native app. Keep compatible with Expo SDK 55.
- `packages/shared`: Domain enums, types, and Zod schemas shared by apps/API.
- `packages/api-client`: Typed fetch helpers shared by web and mobile.
- `sellr-technical-implementation-guide-v2.md`: Detailed architecture and
  baseline reference for platform decisions.

## Architecture Rules
- Keep shared domain contracts in `packages/shared`; do not duplicate enums or
  validation schemas in app code.
- When API request/response behavior changes, update the API route, shared
  schema/types when applicable, and `packages/api-client` together.
- Preserve community-scoped authorization. Listings, search, offers, meetups,
  conversations, reports, and notifications must respect membership boundaries.
- Treat auth differently by client: mobile uses returned JWTs, web uses
  httpOnly cookies and same-origin `/api/v1` rewrites.
- For database changes, use Prisma 7 patterns already in `apps/api`, add a
  migration, and account for generated client imports from
  `apps/api/src/generated/prisma`.
- Keep location features privacy-preserving: prefer neighborhood/radius and
  PostGIS proximity over exposing exact pickup addresses before acceptance.

## Web Development Rules
- The web app uses Next.js 16, React 19, Tailwind CSS 4, and App Router. Do not
  assume older Next.js conventions; read relevant docs under
  `node_modules/next/dist/docs/` before changing framework-sensitive code.
- Build the actual app experience first, not landing-page scaffolding.
- Keep operational marketplace UI dense, clear, and task-focused. Avoid
  decorative marketing layouts for dashboard or workflow screens.
- Every interactive web flow should include loading, empty, error, and success
  states as appropriate.
- Prefer shared API helpers from `@sellr/api-client` and React Query for
  server data access in client components.

## API And Data Rules
- Fastify routes should validate input with Zod schemas from `@sellr/shared`
  whenever the schema is reusable by clients.
- Return consistent `ok(...)` response shapes from API modules unless an
  existing route pattern says otherwise.
- Use BullMQ queues for async side effects such as search sync, notifications,
  saved search work, and AI pipelines.
- Search is community-scoped through Algolia filters; do not expose global
  marketplace search by default.
- Notifications should be created through the existing notification helpers so
  push behavior remains centralized.

## Local Development
- Install dependencies with `pnpm install`.
- Use `pnpm env:web` to create/update `apps/web/.env.local` from root env
  values.
- Redis is provided by `docker compose up -d redis`.
- Local Postgres/PostGIS is managed by Supabase from `apps/api` with
  `supabase start`.
- Run migrations with `pnpm db:migrate`.

## Verification
- Prefer targeted checks while iterating, then broader checks before handoff
  when practical.
- Root commands:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Useful focused commands:
  - `pnpm --filter @sellr/web typecheck`
  - `pnpm --filter @sellr/web lint`
  - `pnpm --filter @sellr/api typecheck`
  - `pnpm --filter @sellr/api test`
  - `pnpm --filter @sellr/shared typecheck`
  - `pnpm --filter @sellr/api-client typecheck`

## Engineering Rules
- Follow existing architecture and package conventions.
- Prefer completing existing scaffolding over replacing it.
- Do not add production dependencies without justification.
- Keep changes small and reviewable.
- Protect user data and trust boundaries over implementation convenience.
- Do not introduce mock-only UI dead ends for core flows unless clearly marked
  as temporary and requested.
- Run relevant lint, typecheck, tests, and build commands after changes.
- Summarize verification results and remaining risks.

## Handoff Checklist
- Explain what changed and why.
- Call out touched packages/apps.
- Include verification commands and results.
- Mention any migrations, env changes, new dependencies, or follow-up risks.
