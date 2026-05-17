# Sellr Agent Instructions

## Product Direction
Sellr is a trust-native local marketplace for verified, high-trust communities.
It is optimized for local peer-to-peer resale where identity, proximity,
availability, and pickup coordination matter.

Current priority is the web SLC/MVP: the smallest complete buyer/seller
experience that feels usable, polished, and trustworthy.

Before Phase 6 AI work, prioritize the documented UI/UX overhaul in
`docs/ui-ux-overhaul-guide.md`: simplify onboarding and core flows, make the app
feel more personal and local, and remove generic "AI/vibe-coded" UI patterns.

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

## Current Web SLC Surface
The current web SLC includes Resend email OTP login with Twilio phone fallback,
community onboarding, marketplace browse/search/filter, listing detail, durable
R2-backed listing photo upload, seller inventory management, sold lifecycle,
seller trust cards, seller storefront-lite pages, buyer contact and inbox
replies, notifications, basic reporting, an admin-only reports dashboard with
explicit listing removal, admin community setup, media lifecycle cleanup, and a
seller readiness panel on `/dashboard`. Before adding breadth, keep these flows
polished and covered by the readiness gate.

## Current Deployment Context
- GitHub Actions CI and production migration checks are passing.
- GitHub `main` is protected; use pull requests for changes to `main`.
- Supabase is the production Postgres/PostGIS database.
- Railway hosts the Fastify API and Redis. The primary public API origin is
  `https://api.sellr-ai.com`, backed by
  `https://api-production-be29.up.railway.app`.
- Vercel hosts the production web app at `https://sellr-ai.com`, backed by
  `https://sellr-web.vercel.app`.
- Production Resend email OTP is the primary web sign-in path, with Twilio
  Verify retained as phone fallback. Same-origin Vercel `/api/v1` rewrites,
  admin/community setup, durable R2 listing image uploads, and media lifecycle
  cleanup have been deployed and smoke-tested.
- The API currently starts with `tsx src/index.ts` to avoid the Prisma 7
  generated-client ESM/CommonJS runtime crash from `node dist/index.js`.
- Do not add `"type": "module"` to `apps/api/package.json` unless doing the full
  NodeNext ESM migration, including explicit `.js` relative imports.
- Keep Vercel web env vars aligned with `docs/deployment.md`, especially
  `INTERNAL_API_URL`, `NEXT_PUBLIC_USE_SAME_ORIGIN_API`,
  `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_LISTING_IMAGE_CDN_URL`, and
  `NEXT_PUBLIC_SITE_URL`.
- Keep Railway API env vars aligned with `docs/deployment.md`, especially
  `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_OTP_ALLOWED_DOMAINS`, and the optional
  `EMAIL_OTP_SECRET`.
- Custom domains, email-first auth, `Badger Market` community access, R2/CDN
  uploads, and the buyer/seller loop have been production-smoke-tested. Next
  production-hardening work should focus on launch monitoring, seed inventory,
  media health, and alerting for structured ops signals.
- See `docs/current-state-and-scope.md`, `docs/deployment.md`,
  `docs/custom-domain-cutover.md`, `docs/email-first-auth.md`, and
  `docs/next-session-context.md` before continuing deployment or
  production-hardening work. See `docs/ui-ux-overhaul-guide.md` before
  continuing product UI work.

## Repository Map
- `apps/web`: Next.js 16 App Router web SLC and seller/admin surfaces.
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
  - `pnpm slc:ready`
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

## Cursor Cloud specific instructions

### Infrastructure startup

Before running dev servers, start the backing services:

1. **Docker daemon** — required for Redis. Start with `sudo dockerd &>/tmp/dockerd.log &`
   then `sudo chmod 666 /var/run/docker.sock`.
2. **Redis** — `docker compose up -d redis` (port 6379).
3. **Supabase (Postgres 17 + PostGIS)** — `cd apps/api && supabase start` (port 54322).
   First run pulls ~1 GB of Docker images; subsequent starts are fast.
4. **Migrations** — `pnpm db:migrate` (idempotent; safe to re-run).

### Running dev servers

- API: `pnpm --filter @sellr/api dev` → http://localhost:3001
- Web: `pnpm --filter @sellr/web dev` → http://localhost:3000

The web app proxies `/api/v1/*` to the API via Next.js rewrites (same-origin
cookie auth). Both servers support hot reload.

### Environment files

- Root `.env` — copied from `.env.example`; holds DB, Redis, JWT, and
  third-party keys. Generate real JWT secrets with `openssl rand -base64 64`.
- `apps/web/.env.local` — created by `pnpm env:web` (copies from
  `apps/web/.env.example`).

### Gotchas

- The `pnpm install` output warns about ignored build scripts for
  `@sentry/cli`, `esbuild`, `msgpackr-extract`, `sharp`, `unrs-resolver`.
  These are covered by `pnpm.onlyBuiltDependencies` for the Prisma packages
  only. The warnings are safe to ignore; those packages work without native
  builds in dev.
- Prisma client must be generated before typecheck/build: `pnpm --filter
  @sellr/api db:generate` or it runs automatically in the `typecheck`/`build`
  scripts.
- Twilio, Algolia, OpenAI, R2, and other external service keys are optional
  for local dev. The app degrades gracefully without them (OTP flow hits the
  API but no SMS is sent; search is unavailable; AI features are disabled).
- The `@sellr/mobile` workspace typechecks and lints but is not the current
  development priority (web SLC focus).
