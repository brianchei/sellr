# Sellr Deployment Notes

This document captures the current deployment topology for the web SLC. Keep
secrets out of source control; values below are variable names, public origins,
or examples.

## Current Deployment State

- GitHub Actions `ci` passes.
- GitHub Actions `Deploy` runs Prisma production migrations on pushes to
  `main` and on manual dispatch.
- GitHub `main` is protected. Use pull requests for changes that need to land
  on `main`.
- Supabase is the production PostgreSQL/PostGIS database.
- Railway hosts the Fastify API and Redis service.
- Vercel hosts the production Next.js web app at:

```text
https://sellr-ai.com
```

- The current public API origin is:

```text
https://api.sellr-ai.com
```

- Backing provider URLs remain useful for diagnostics and rollback:

```text
Web backing URL: https://sellr-web.vercel.app
API backing URL: https://api-production-be29.up.railway.app
```

- Production email OTP, same-origin web rewrites, admin/community setup,
  durable R2 listing image uploads, and media lifecycle cleanup are part of the
  launch path. Twilio remains available for the phone sign-in fallback.
- As of May 11, 2026, the `sellr-ai.com` custom domain stack, `@wisc.edu`
  email OTP, `Badger Market` join, `BADGER2026`, `cdn.sellr-ai.com` media
  uploads, buyer contact/inbox, notifications, and seller listing lifecycle
  have been production-smoke-tested.

## Production Topology

```text
Browser
  -> Vercel Next.js web app
  -> same-origin /api/v1 rewrite
  -> Railway Fastify API
  -> Supabase Postgres/PostGIS
  -> Railway Redis/BullMQ
```

Realtime inbox and notification freshness uses Socket.IO directly from the web
client to `https://api.sellr-ai.com` unless a future reverse proxy forwards
WebSocket upgrades through the web origin.

## Railway API Service

The API service should deploy from `main`. Its start script is currently:

```json
"start": "tsx src/index.ts"
```

This is intentional for the current deployment. Running the compiled
`dist/index.js` output previously crashed at runtime with Prisma 7 generated
client ESM/CommonJS interop errors. A full API ESM migration can replace this
later, but it is not required for the SLC deploy.

Required Railway API variables:

```text
DATABASE_URL
DIRECT_URL
REDIS_URL
JWT_SECRET
ALLOWED_ORIGINS
RESEND_API_KEY
EMAIL_FROM
EMAIL_OTP_ALLOWED_DOMAINS
CLOUDFLARE_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
CLOUDFLARE_CDN_URL
```

Production domain values:

```text
ALLOWED_ORIGINS=https://sellr-ai.com,https://www.sellr-ai.com,https://sellr-web.vercel.app
CLOUDFLARE_CDN_URL=https://cdn.sellr-ai.com
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
```

Recommended optional variables when the corresponding services are configured:

```text
EMAIL_OTP_TTL_SECONDS
EMAIL_OTP_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
ALGOLIA_APP_ID
ALGOLIA_API_KEY
ALGOLIA_SEARCH_KEY
SENTRY_DSN_API
POSTHOG_API_KEY
POSTHOG_HOST
LANGFUSE_SECRET_KEY
LANGFUSE_PUBLIC_KEY
LANGFUSE_BASE_URL
LOGTAIL_SOURCE_TOKEN
```

### Listing Image Storage

Production listing image uploads use Cloudflare R2 through its S3-compatible
API, then serve immutable public URLs from the configured CDN/custom domain or
temporary R2 public development URL.

Required Railway API variables:

```text
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
R2_BUCKET_NAME=sellr-media
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
CLOUDFLARE_CDN_URL=https://cdn.sellr-ai.com
```

`NODE_ENV=production` makes the API require R2 storage. For local development,
the API keeps using local disk unless you explicitly set:

```text
LISTING_IMAGE_STORAGE_DRIVER=r2
```

Keep the R2 bucket private for writes. A Cloudflare R2 Public Development URL
can be used temporarily for smoke testing and early low-traffic production, but
a custom media domain such as `cdn.<production-domain>` is preferred before
broader launch for normal Cloudflare cache and security controls.

Listing media lifecycle cleanup is tracked in the database:

- New uploads start as pending media assets and are queued for deletion if they
  are not attached to a listing within 24 hours.
- Listing creation and edit attach the referenced Sellr-owned images.
- Deleted listings and removed/replaced listing photos enqueue object deletion.
- Admin report moderation has an explicit "remove listing" action that removes
  the listing from marketplace search, clears its listing photos, resolves the
  report, and enqueues image deletion.

Useful media ops commands:

```bash
pnpm --filter @sellr/api media:health
pnpm --filter @sellr/api media:cleanup-expired -- --dry-run
pnpm --filter @sellr/api media:cleanup-expired
pnpm --filter @sellr/api media:retry-failed -- --dry-run
pnpm --filter @sellr/api media:retry-failed
```

See [`production-runbook.md`](./production-runbook.md) for safe usage and
incident steps.

See [`custom-domain-cutover.md`](./custom-domain-cutover.md) for the manual
Cloudflare, Vercel, Railway, R2, and Resend setup behind `sellr-ai.com`, and
[`current-state-and-scope.md`](./current-state-and-scope.md) for the current
launch state.

### Supabase URLs

Use the Supabase pooler URLs without wrapping quotes in Railway or GitHub
Secrets.

```text
DATABASE_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@<pooler-host>:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<url-encoded-password>@<pooler-host>:5432/postgres
```

The same Supabase database password belongs in both URLs. URL-encode special
characters in the password.

### Redis URL

The API reads only `REDIS_URL`. Do not rely on local Redis fallback in
production.

If Railway service references resolve correctly, set the API variable to:

```text
REDIS_URL=redis://${{Redis.REDISUSER}}:${{Redis.REDISPASSWORD}}@${{Redis.REDISHOST}}:${{Redis.REDISPORT}}
```

Use the exact Redis service name and variable names shown by Railway
autocomplete. If Railway uses `REDIS_PASSWORD` instead of `REDISPASSWORD`, use
the exact displayed name.

The final resolved value must look like:

```text
redis://default:<password>@redis.railway.internal:6379
```

`redis.railway.internal` by itself is only a host and is not enough.

### One-Time Cache Flag

`NO_CACHE=1` was used only to clear a stale Railway BuildKit cache that had
tracked dependency folders incorrectly. Remove `NO_CACHE` after one successful
clean deployment.

### Health Check

Use:

```text
https://api.sellr-ai.com/health
```

Expected response shape:

```json
{
  "status": "ok",
  "ts": "..."
}
```

## Vercel Web App

Recommended deployment settings:

```text
Framework Preset: Next.js
Root Directory: apps/web
Install Command: default, or pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: default, or .next
```

Vercel should run the build from `apps/web` when that root directory is
selected. If Vercel instead runs commands from the repository root, use:

```text
Build Command: pnpm --filter @sellr/web build
```

Required Vercel web variables:

```text
INTERNAL_API_URL=https://api.sellr-ai.com
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api.sellr-ai.com
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr-ai.com
NEXT_PUBLIC_SITE_URL=https://sellr-ai.com
```

Do not include `/api/v1` in `INTERNAL_API_URL`; `apps/web/next.config.ts`
appends `/api/v1` in the rewrite.

Do not set `NEXT_PUBLIC_API_URL` for the normal web cookie-auth flow. The web
browser should call same-origin `/api/v1` so httpOnly auth cookies are sent
correctly.

The current production web origins should be present in Railway API:

```text
ALLOWED_ORIGINS=https://sellr-ai.com,https://www.sellr-ai.com,https://sellr-web.vercel.app
```

Use comma-separated origins with no spaces. Keep the `vercel.app` origin only
if you want direct rollback or diagnostic access to the backing deployment.

Vercel Web Analytics and Speed Insights are mounted in the web root layout.
Enable the dashboard-side features in the Vercel project if data is not
appearing after production traffic.

## GitHub Secrets

Repository secrets used by production migrations:

```text
DATABASE_URL
DIRECT_URL
```

These belong in GitHub Actions **Secrets**, not GitHub Actions Variables.

## Production Email OTP

Local OTP code `000000` is disabled in production. The primary web login path
uses Resend email OTP for verified student email sign-in:

```text
RESEND_API_KEY
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
EMAIL_OTP_TTL_SECONDS=600
EMAIL_OTP_ALLOWED_DOMAINS=wisc.edu
EMAIL_OTP_SECRET=<long-random-secret>
```

For the launch domain, verify `send.sellr-ai.com` in Resend using Cloudflare
DNS records. Create a sending-access Resend API key scoped to that domain and
store it only in Railway.

If `RESEND_API_KEY` or `EMAIL_FROM` is missing in Railway, email sign-in fails
with `Email sign-in is not configured`.

Twilio Verify remains the phone sign-in fallback for invited testers or mobile:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
```

If these are missing in Railway, phone sign-in will fail with
`Twilio Verify is not configured`.

See [`email-first-auth.md`](./email-first-auth.md) for the full auth flow,
local `000000` behavior, Resend setup, and `wisc.edu` community-gate rules.

## Known Production Caveats

- Listing image uploads use Cloudflare R2/CDN when the required storage
  variables are configured on Railway. Legacy same-origin upload URLs are still
  served by the API for compatibility, but new production uploads should return
  `https://cdn.sellr-ai.com` URLs.
- Media lifecycle cleanup is asynchronous. If Redis delayed jobs need a catch-up
  pass, run `pnpm --filter @sellr/api media:cleanup-expired`.
- The API currently starts from TypeScript through `tsx`. This is acceptable for
  the immediate SLC deployment but should be revisited with a full ESM build
  path before heavier production use.
- Realtime uses a direct Socket.IO connection to the API origin. If the web app
  later moves behind a same-origin proxy, that proxy must support WebSocket
  upgrades.

## Post-Deploy Verification

The full production smoke path has passed on `sellr-ai.com`. Repeat it after
domain/env changes, migrations, or deploys that touch auth, communities,
listings, uploads, messaging, notifications, or reports:

1. Use [`launch-release-checklist.md`](./launch-release-checklist.md) as the
   canonical ordered path.
2. Run `pnpm smoke:production-public`.
3. Run the authenticated and mutable steps in
   [`launch-smoke-checklist.md`](./launch-smoke-checklist.md).
4. Record inventory readiness, media health, email OTP, listing CDN URL,
   messaging, notification, and admin/report evidence.
5. Confirm a newly uploaded listing image still loads after a Railway API
   redeploy.
6. Use [`launch-monitoring.md`](./launch-monitoring.md) for the active watch
   window, alert thresholds, provider dashboards, and rollback signals.

For local release verification, keep using:

```bash
pnpm slc:ready
```
