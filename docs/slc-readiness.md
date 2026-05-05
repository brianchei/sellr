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
- Open a community-scoped seller storefront with trust signals, active listings,
  report seller action, and contact-through-listing guidance.
- Create, edit, publish, unpublish, delete, and mark listings sold.
- Upload listing photos from local files with inline validation and previews.
- Contact a seller from listing detail and continue the conversation in inbox.
- See notification badges and a notification center for messages, marketplace
  posts, listing status changes, and pickup-sensitive listing updates.
- Submit basic listing/message reports.
- Review seeded and user-submitted reports from the admin-only
  `/admin/reports` dashboard.
- Use the dashboard seller readiness panel to see listing presence, photo
  quality, buyer activity, and the next best seller action.
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

Run the release readiness command before any SLC handoff:

```bash
pnpm slc:ready
```

This resets seeded demo data, runs the seller/buyer/web smoke checks, then runs
the focused contract, API, and web lint/typecheck/test/build checks. Use dry run
mode to inspect the exact command plan without executing it:

```bash
pnpm slc:ready -- --dry-run
```

If you need to run the same checks manually, use:

```bash
pnpm --filter @sellr/api exec prisma db seed
pnpm smoke:seller
pnpm smoke:buyer
pnpm smoke:web
pnpm --filter @sellr/shared typecheck
pnpm --filter @sellr/api-client typecheck
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
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
- `/sellers/[sellerId]`: seller trust signals, active listing cards,
  contact-through-listing copy, report seller action.
- `/inbox` and `/inbox/[conversationId]`: conversation list, message thread,
  composer, long message wrapping, report message action.
- `/notifications`: unread badge, category tabs, mark-read actions, links to
  inbox/listing detail, empty/error states.
- `/admin/reports`: admin-only report list, filters, target links, status
  actions, restricted-access state for non-admin users.
- `/sell`: inline validation, file image upload feedback, buyer preview,
  submit state.
- `/listings`: status filters, create/publish notices, listing actions, sold
  lifecycle.
- `/listings/[listingId]/edit`: edit form layout, save notice, owner-only guard.
- `/dashboard`: profile preview/edit state, seller readiness panel, next best
  action, and community access copy.

## Demo Data

The seed creates the `Dev Campus` community and invite code `DEV2026`.
Local OTP accepts `000000`.
When Twilio Verify is not configured locally, OTP send requests skip the
per-phone hourly SMS limiter so repeated demo sign-ins do not get stuck before
the verification-code step. Real SMS sends still use the production-style
per-phone limiter.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera
- Admin: `+15550000003` / Priya Shah

The seller smoke test uploads a temporary listing image and deletes its
temporary listing at the end. The buyer smoke test appends a `[smoke]` message
to the seeded conversation.
Rerun the seed when you want to reset demo content; it clears local `Dev Campus`
demo listings, conversations, reports, and notifications before recreating the
fixtures.

## Expected Local Caveats

- Restart the API dev server after route or generated-client changes if smoke
  tests return stale endpoint behavior.
- Databases without the optional `location_geom` column fall back to
  community-scoped listings without distance ranking.
- Listing photos upload to local API storage for the web SLC. Production media
  storage and cleanup policies are still outside the first SLC.
- Browser route smoke validates authenticated HTML responses, not pixel-level
  visual layout. Use the manual visual pass for layout sign-off.

## Remaining Outside The First SLC

These are intentionally deferred until the core web loop is stable:

- Production-grade media storage, CDN delivery, and cleanup policies.
- Ratings, KYC, full reputation, or advanced moderation workflows.
- Payments, offers, meetup scheduling, and delivery/logistics.
- Push/realtime notification polish beyond existing API foundations.
- Advanced search growth loops such as saved searches and recommendations.
- Native mobile parity and broader admin tooling.
