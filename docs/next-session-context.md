# Sellr Next Session Context

Use this brief to continue deployment or development in a new Codex session.

## Product And Scope

Sellr is a trust-native local marketplace for high-trust local communities.
The current priority remains the web SLC/MVP: a complete buyer/seller loop that
feels clear, trustworthy, and usable without broad marketplace scope creep.

The current web SLC includes:

- OTP login and community onboarding.
- Marketplace browse/search/filter.
- Listing detail with seller trust signals.
- File-based listing photo upload.
- Structured listing creation and seller inventory management.
- Durable R2/CDN listing image uploads, plus edit, publish/unpublish, delete,
  and sold-listing lifecycle.
- Seller storefront-lite pages.
- Buyer contact, inbox threads, and replies.
- Notifications and unread badges.
- Basic reporting plus admin-only reports review.
- Admin-only community invite and member access setup.
- Dashboard profile/trust preview and seller readiness panel.

Defer payments, escrow, advanced KYC, ratings/reputation, complex moderation,
delivery/logistics, advanced AI/recommendations, and native mobile polish unless
explicitly requested.

## Current Infrastructure State

- GitHub Actions `ci` passes.
- GitHub Actions `Deploy` passes production Prisma migrations after the
  Supabase URL/password issues were fixed.
- GitHub `main` is protected; changes should go through pull requests.
- Supabase is connected as the production Postgres/PostGIS database.
- Railway API deployment now passes.
- Railway Redis is connected after setting the API service `REDIS_URL` to a
  full Redis URL instead of a host-only value.
- Current Railway API origin:

```text
https://api-production-be29.up.railway.app
```

- API health URL:

```text
https://api-production-be29.up.railway.app/health
```

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
- Do not set `NEXT_PUBLIC_API_URL` for the normal production web flow unless the
  auth architecture is intentionally changed.

## Remaining Deployment Steps

1. Deploy `apps/web` to Vercel.
2. Use root directory `apps/web`.
3. Set Vercel web env vars:

```text
INTERNAL_API_URL=https://api-production-be29.up.railway.app
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api-production-be29.up.railway.app
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr.com
```

4. After Vercel generates the web origin, set Railway API:

```text
ALLOWED_ORIGINS=https://<vercel-web-origin>
```

5. Confirm Railway API has Twilio Verify variables for production OTP:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
```

6. Confirm Railway API has Cloudflare R2 listing image storage variables:

```text
CLOUDFLARE_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
CLOUDFLARE_CDN_URL
```

7. Redeploy API after changing `ALLOWED_ORIGINS` or storage variables.
8. Redeploy or promote the Vercel web app.
9. Run a manual production smoke test.

## Manual Production Smoke Test

Use real Twilio OTP in production.

1. Open the Vercel web URL.
2. Sign in.
3. Join or confirm community access.
4. Browse `/marketplace`.
5. Open a listing detail page.
6. Contact the seller.
7. Confirm the inbox thread exists.
8. Confirm notifications update.
9. Create a listing with an uploaded image.
10. Edit/publish/unpublish/mark sold from seller inventory.
11. Open a seller storefront.
12. Open `/admin/reports` with an admin user.

## Local Verification Baseline

The latest local release readiness run passed:

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

## Files To Read First

- `AGENTS.md`
- `README.md`
- `docs/deployment.md`
- `docs/slc-readiness.md`
- `docs/slc-smoke-test.md`
- `docs/design-language.md`
- `apps/web/README.md`
- `sellr-technical-implementation-guide-v2.md`

## Follow-Up Engineering Risks

- Confirm Cloudflare R2/CDN listing image uploads stay healthy after production
  deploy and add lifecycle cleanup once listing deletion/media retention policy
  is decided.
- Consider converting the API to a true ESM production build later, replacing
  the current `tsx src/index.ts` production start workaround.
- Confirm Twilio Verify is configured before testing production login.
- Confirm Redis logs stay quiet after deploy; any `127.0.0.1:6379` errors mean
  `REDIS_URL` is missing or malformed.
- Add the final Vercel web origin to `ALLOWED_ORIGINS` before testing browser
  auth and Socket.IO.

## Suggested Next Request

Ask the next session to help deploy and verify the web app:

```text
Read AGENTS.md and docs/next-session-context.md. Continue Sellr deployment by
deploying apps/web to Vercel, configuring the production web environment
variables, updating Railway ALLOWED_ORIGINS with the Vercel origin, and walking
through the production smoke test. Do not add scope beyond blocker-only deploy
polish.
```
