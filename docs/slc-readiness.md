# Sellr Web SLC Readiness

Use this checklist to decide whether the first web SLC is ready for demo or
handoff. It complements the detailed smoke path in
[`slc-smoke-test.md`](./slc-smoke-test.md).

## Current SLC Scope

The web SLC is the smallest complete buyer/seller loop for a verified local
community:

- Sign in with email OTP, or phone OTP fallback, and join a seeded community.
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
pnpm smoke:auth-onboarding
pnpm smoke:seller
pnpm smoke:buyer
pnpm smoke:inbox
pnpm smoke:notifications
pnpm smoke:reports
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

## Production Deployment Gate

The current production web SLC is deployed on Vercel and Railway:

```text
Web: https://sellr-ai.com
API: https://api.sellr-ai.com
```

API health:

```text
https://api.sellr-ai.com/health
```

Latest production smoke status, May 11, 2026:

- Custom web/API/media domains are active.
- `@wisc.edu` email OTP works through Resend.
- `Badger Market` join works by verified email domain.
- `BADGER2026` works as the invite-code fallback.
- Listing image uploads return `https://cdn.sellr-ai.com` URLs.
- Listing detail, buyer contact, inbox, notifications, seller lifecycle, and
  test-listing deletion checks passed.

Before a production demo or release handoff:

- Confirm `https://api.sellr-ai.com/health` returns `ok`.
- Confirm `https://sellr-ai.com/api/v1/auth/me` returns
  `{"error":"Unauthorized"}` when logged out.
- Confirm Railway API logs do not show Redis fallback errors such as
  `127.0.0.1:6379` or `::1:6379`.
- Remove the temporary Railway `NO_CACHE=1` variable if it is still present.
- Confirm Vercel production is on latest `main` before debugging missing UI.
- Confirm `www.sellr-ai.com` redirects to the chosen primary web domain.
- Confirm Resend sends real email OTP in production; confirm Twilio only if the
  phone fallback is part of the release smoke.
- Confirm `Badger Market` is configured as an `email_domain` community for
  `wisc.edu`, with invite codes available only as a secondary path.
- Confirm new listing image uploads return the configured R2/CDN origin and
  still load after a Railway API redeploy.
- Confirm admin/community setup works for invite creation and member
  role/status management.
- Confirm admin report **Remove listing** works for listing reports and queues
  media cleanup.
- Confirm Vercel Web Analytics and Speed Insights are enabled in the Vercel
  dashboard if metrics are expected.

See [`deployment.md`](./deployment.md) and
[`next-session-context.md`](./next-session-context.md) for the detailed
deployment handoff.

## Manual Visual Acceptance

After automated checks pass, review the core routes at desktop and mobile
widths:

For the Pre-Phase 6 UI/UX overhaul, also use
[`ui-ux-overhaul-guide.md`](./ui-ux-overhaul-guide.md) as the visual acceptance
brief. In addition to route coverage below, confirm onboarding is simpler, the
signed-in first screen has one obvious next action, generic card-heavy patterns
are reduced, and the app feels more personal and local without adding new
product scope.

- `/marketplace`: filters, listing cards, empty/error states, tap targets.
- `/marketplace/[listingId]`: photo area, seller trust card, contact form,
  report action, owner action state.
- `/sellers/[sellerId]`: seller trust signals, active listing cards,
  contact-through-listing copy, report seller action.
- `/inbox` and `/inbox/[conversationId]`: conversation list, active/archived
  filters, message thread, composer, long message wrapping, archive/restore,
  report message action.
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

The seed creates the `Dev Campus` community, enables `wisc.edu` email-domain
join locally, and keeps invite code `DEV2026` for fallback testing.
Local email and SMS OTP accept `000000` when Resend/Twilio are not configured.
Email sign-in is the primary web path for launch, while phone sign-in remains
available for demo accounts and invite-code fallback testing. Real provider
sends still use production-style rate limits.
Use any `@wisc.edu` address with local code `000000` to test email-domain
onboarding; use the seeded phone users below for the repeatable smoke fixtures.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera
- Admin: `+15550000003` / Priya Shah

The seller smoke test uploads a temporary listing image and deletes its
temporary listing at the end. The buyer smoke test appends a `[smoke]` message
to the seeded conversation.
The auth/onboarding smoke reuses `sellr-smoke-onboarding@wisc.edu` by default,
removes that smoke user's existing community memberships, then rejoins by
verified email domain. Override it with `SELLR_SMOKE_ONBOARDING_EMAIL` when
running many local auth checks against provider rate limits.

Rerun the seed when you want to reset demo content; it clears local `Dev Campus`
demo listings, conversations, reports, and notifications before recreating the
fixtures.

## Expected Local Caveats

- Restart the API dev server after route or generated-client changes if smoke
  tests return stale endpoint behavior.
- Databases without the optional `location_geom` column fall back to
  community-scoped listings without distance ranking.
- Listing photos upload to local API storage in development. Production uses
  R2/CDN when Railway storage variables are configured.
- Media cleanup is asynchronous: deleted/replaced listing images and explicit
  admin listing removals enqueue object deletion, and abandoned uploads expire
  after 24 hours.
- Browser route smoke validates authenticated HTML responses, not pixel-level
  visual layout. Use the manual visual pass for layout sign-off.

## Remaining Outside The First SLC

These are intentionally deferred until the core web loop is stable:

- Long-term media retention/reconciliation jobs beyond the current 24-hour
  abandoned-upload catch-up script.
- Ratings, KYC, full reputation, or advanced moderation workflows.
- Payments, offers, meetup scheduling, and delivery/logistics.
- Push/realtime notification polish beyond existing API foundations.
- Advanced search growth loops such as saved searches and recommendations.
- Native mobile parity and broader admin tooling.
