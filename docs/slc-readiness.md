# Sellr Web SLC Readiness

Use this checklist to decide whether the first web SLC is ready for demo or
handoff. It complements the detailed smoke path in
[`slc-smoke-test.md`](./slc-smoke-test.md).

## Current SLC Scope

The web SLC is the smallest complete buyer/seller loop for a verified local
community:

- Sign in with local OTP and join a seeded community.
- Browse active community listings and inspect listing detail.
- See seller trust signals: display name, verified/community status, member
  since, and active listing count.
- Create, edit, publish, unpublish, delete, and mark listings sold.
- Contact a seller from listing detail and continue the conversation in inbox.
- Submit basic listing/message reports.
- Exercise the flow with seeded demo users and repeatable smoke scripts.

## Required Local Stack

Before running readiness checks:

```bash
docker compose up -d redis
cd apps/api && supabase start && cd ../..
pnpm db:migrate
pnpm --filter @sellr/api exec prisma db seed
pnpm --filter @sellr/api dev
pnpm --filter @sellr/web dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Web proxy: `http://localhost:3000/api/v1`

## Automated Readiness Checks

Run these before any SLC handoff:

```bash
pnpm smoke:seller
pnpm smoke:buyer
pnpm smoke:web
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
```

For API-affecting changes, also run:

```bash
pnpm --filter @sellr/api lint
pnpm --filter @sellr/api typecheck
pnpm --filter @sellr/api test
pnpm --filter @sellr/api build
```

The local web build may print a Sentry auth-token warning. That is expected
unless release upload credentials are configured.

## Manual Visual Acceptance

After automated checks pass, review the core routes at desktop and mobile
widths:

- `/marketplace`: filters, listing cards, empty/error states, tap targets.
- `/marketplace/[listingId]`: photo area, seller trust card, contact form,
  report action, owner action state.
- `/inbox` and `/inbox/[conversationId]`: conversation list, message thread,
  composer, long message wrapping, report message action.
- `/sell`: inline validation, image URL feedback, buyer preview, submit state.
- `/listings`: status filters, create/publish notices, listing actions, sold
  lifecycle.
- `/listings/[listingId]/edit`: edit form layout, save notice, owner-only guard.
- `/dashboard`: profile preview/edit state and community access copy.

## Demo Data

The seed creates the `Dev Campus` community and invite code `DEV2026`.
Local OTP accepts `000000`.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera

The buyer smoke test appends a `[smoke]` message to the seeded conversation.
Rerun the seed when you want to reset demo content.

## Expected Local Caveats

- Restart the API dev server after route or generated-client changes if smoke
  tests return stale endpoint behavior.
- Databases without the optional `location_geom` column fall back to
  community-scoped listings without distance ranking.
- Image support is URL-based for the SLC; upload/storage integration is out of
  scope.
- Browser route smoke validates authenticated HTML responses, not pixel-level
  visual layout. Use the manual visual pass for layout sign-off.

## Remaining Outside The First SLC

These are intentionally deferred until the core web loop is stable:

- Production-grade image uploads and media management.
- Ratings, KYC, full reputation, or advanced moderation workflows.
- Payments, offers, meetup scheduling, and delivery/logistics.
- Push/realtime notification polish beyond existing API foundations.
- Advanced search growth loops such as saved searches and recommendations.
- Native mobile parity and broader admin tooling.
