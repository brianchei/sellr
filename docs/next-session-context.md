# Sellr Next Session Context

Use this brief to continue production hardening or development in a new agent
session.

## Product And Scope

Sellr is a trust-native local marketplace for high-trust local communities. The
current priority remains the web SLC/MVP: a complete buyer/seller loop that
feels clear, trustworthy, and usable without broad marketplace scope creep.

The current web SLC includes:

- Production Twilio OTP login and community onboarding.
- Marketplace browse/search/filter and listing detail with seller trust signals.
- Structured listing creation, durable R2-backed listing photo upload, edit,
  publish/unpublish, delete, and sold-listing lifecycle.
- Media lifecycle cleanup for abandoned uploads, deleted/replaced listing
  images, and explicit admin listing removals from reports.
- Seller storefront-lite pages.
- Buyer contact, inbox threads, replies, notifications, and unread badges.
- Basic reporting plus admin-only report review and explicit listing removal.
- Admin-only community setup for invite codes and member role/status management.
- Dashboard profile/trust preview and seller readiness panel.
- Vercel Web Analytics and Speed Insights in the web app root layout.

Defer payments, escrow, advanced KYC, ratings/reputation, complex moderation,
delivery/logistics, advanced AI/recommendations, and native mobile polish unless
explicitly requested.

## Current Production State

- GitHub Actions `ci` passes.
- GitHub Actions `Deploy` applies production Prisma migrations on pushes to
  `main` and manual dispatch.
- GitHub `main` is protected; changes should go through pull requests.
- Supabase is the production Postgres/PostGIS database.
- Railway hosts the Fastify API and Redis.
- Vercel hosts the production web app:

```text
https://sellr-web.vercel.app
```

- Current Railway API origin:

```text
https://api-production-be29.up.railway.app
```

- API health URL:

```text
https://api-production-be29.up.railway.app/health
```

- Production OTP has been verified with real Twilio SMS.
- Same-origin Vercel `/api/v1` rewrites to Railway have been verified; the
  expected unauthenticated proxy check is `{"error":"Unauthorized"}` from:

```text
https://sellr-web.vercel.app/api/v1/auth/me
```

- Durable listing image storage has been verified: new uploads return an R2/CDN
  URL and still load after a Railway API redeploy.
- Media lifecycle cleanup has been deployed and production-smoke-tested for the
  main paths: pending/attached media tracking, image replacement, listing
  deletion, and explicit admin listing removal from reports.

## Important Deployment Decisions

- Do not blindly add `"type": "module"` to `apps/api/package.json`. That starts
  a broader NodeNext ESM migration because relative imports need explicit
  `.js` extensions.
- The current deploy-safe API start command is:

```json
"start": "tsx src/index.ts"
```

- This avoids the Prisma 7 generated-client runtime crash seen when Railway ran
  `node dist/index.js`.
- `NO_CACHE=1` was only a temporary Railway cache repair variable. Remove it if
  it is still present after a successful clean deploy.
- The web app should preserve httpOnly cookie auth by calling same-origin
  `/api/v1` in the browser. Vercel/Next rewrites that path to Railway through
  `INTERNAL_API_URL`.
- `turbo.json` must allow production web build env vars such as
  `INTERNAL_API_URL`, `NEXT_PUBLIC_USE_SAME_ORIGIN_API`,
  `NEXT_PUBLIC_REALTIME_URL`, and `NEXT_PUBLIC_LISTING_IMAGE_CDN_URL`; otherwise
  Vercel can silently bake local fallback values into the build.
- Do not set `NEXT_PUBLIC_API_URL` for the normal production web flow unless the
  auth architecture is intentionally changed.
- Production can temporarily use a Cloudflare R2 Public Development URL for
  listing images, but a real custom media domain such as
  `cdn.<production-domain>` is the better long-term production setup.

## Required Production Env Vars

Railway API:

```text
DATABASE_URL
DIRECT_URL
REDIS_URL
JWT_SECRET
ALLOWED_ORIGINS=https://sellr-web.vercel.app
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
CLOUDFLARE_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
CLOUDFLARE_CDN_URL
```

Vercel web:

```text
INTERNAL_API_URL=https://api-production-be29.up.railway.app
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api-production-be29.up.railway.app
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=<same public origin as CLOUDFLARE_CDN_URL>
```

Vercel dashboard-side Web Analytics and Speed Insights should also be enabled
for the web project so data appears after the mounted components send events.

## Production Smoke Baseline

Use real Twilio OTP in production. Local `000000` OTP is intentionally disabled
when Twilio is configured in production.

1. Open `https://sellr-web.vercel.app`.
2. Sign in with a real phone number.
3. Join or confirm community access.
4. Browse `/marketplace`.
5. Open a listing detail page.
6. Contact the seller.
7. Confirm the inbox thread exists.
8. Confirm notifications update.
9. Create a listing with an uploaded image and verify the image URL is R2/CDN.
10. Edit/publish/unpublish/mark sold from seller inventory.
11. Replace a listing image and confirm no Railway/R2 cleanup errors.
12. Delete a test listing and confirm associated media cleanup is queued/deleted.
13. Open a seller storefront.
14. Use `/admin/community` to create an invite and manage member role/status.
15. Use `/admin/reports` with an admin user, including explicit listing removal
    for a listing report.

## Local Verification Baseline

Use:

```bash
pnpm slc:ready
```

That command seeds demo data, runs seller/buyer/web smoke checks, then runs
focused package checks for shared contracts, API, and web.

Local demo data:

```text
Community invite: DEV2026
Seller: +15550000001 / Maya Chen
Buyer: +15550000002 / Jordan Rivera
Admin: +15550000003 / Priya Shah
Local OTP: 000000
```

For API integration tests, use a dedicated test DB and `TEST_DATABASE_URL`.
Without it, local DB integration suites are skipped by the repo safety guard.

## Files To Read First

- `AGENTS.md`
- `README.md`
- `docs/deployment.md`
- `docs/slc-readiness.md`
- `docs/slc-smoke-test.md`
- `docs/design-language.md`
- `apps/web/README.md`
- `sellr-technical-implementation-guide-v2.md`

## Current Branch Note

At the time this context was refreshed, the workspace was on
`codex/admin-report-remove-listing-visible`, which is one commit ahead of
`origin/main`:

```text
fix(web): keep listing removal visible for admins
```

That branch makes the report **Remove listing** action visible for any listing
report with an existing target, including already resolved/dismissed reports. If
it has not been merged yet, merge/deploy it or switch back to updated `main`
before starting unrelated work.

## Follow-Up Engineering Risks

- Media cleanup health tooling is now implemented through API scripts:
  `media:health`, `media:cleanup-expired`, and `media:retry-failed`.
- Production runbook coverage lives in `docs/production-runbook.md`.
- Structured Railway/Sentry failure visibility now covers Twilio Verify
  failures, R2 upload/delete failures, media cleanup job failures, refresh-token
  failures, and API 500s by route.
- Next observability step: configure alerting thresholds/destinations for the
  structured failures and media health signals.
- Move listing media from a temporary `r2.dev` public URL to a custom CDN domain
  before broader production launch, if that has not happened yet.
- Consider converting the API to a true ESM production build later, replacing
  the current `tsx src/index.ts` production start workaround.

## Suggested Next Request

Ask the next session to wire alerts around the new visibility layer:

```text
Read AGENTS.md and docs/next-session-context.md. Configure production alerting
for Sellr's key ops signals: API 500s by route, Twilio Verify failures, R2
upload/delete failures, media cleanup job failures, and nonzero media
delete_failed counts. Keep it scoped to observability configuration and docs.
```
