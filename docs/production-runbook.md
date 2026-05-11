# Sellr Production Runbook

Use this runbook for lightweight production checks and media cleanup operations.
Do not paste secrets into chat, issues, or logs.

## Health Checks

API health:

```bash
curl https://api.sellr-ai.com/health
```

Expected shape:

```json
{ "status": "ok", "ts": "..." }
```

Vercel same-origin API proxy:

```text
https://sellr-ai.com/api/v1/auth/me
```

When logged out, the expected response is:

```json
{ "error": "Unauthorized" }
```

That confirms Vercel is rewriting `/api/v1` to the Railway API. If this returns
`DNS_HOSTNAME_RESOLVED_PRIVATE`, check `INTERNAL_API_URL` and redeploy Vercel.
If the custom domain is still propagating, repeat the same check against the
backing Vercel URL `https://sellr-web.vercel.app/api/v1/auth/me`.

## Media Cleanup Health

Run from the repository root with production API environment variables available
to the command:

```bash
pnpm --filter @sellr/api media:health
```

For machine-readable output:

```bash
pnpm --filter @sellr/api media:health -- --json
```

The health command reports:

- Counts by `media_assets.status`.
- Expired `pending` assets older than the 24-hour abandoned-upload window.
- Recent `delete_failed` assets and their last errors.

Healthy baseline:

- `delete_failed` should usually be `0`.
- Expired `pending` should clear after delayed jobs run or after the catch-up
  command below.
- `attached` should grow with active listing media.
- `deleted` should grow after listing deletion, replacement, abandoned upload
  cleanup, and explicit admin listing removal.

## Queue Expired Pending Cleanup

Dry run first:

```bash
pnpm --filter @sellr/api media:cleanup-expired -- --dry-run
```

Queue cleanup jobs:

```bash
pnpm --filter @sellr/api media:cleanup-expired
```

Limit a batch:

```bash
pnpm --filter @sellr/api media:cleanup-expired -- --limit=25
```

This queues deletion jobs for `pending` media assets whose `expires_at` has
passed. The worker deletes the underlying object and marks the row `deleted`.

## Retry Failed Media Deletes

Dry run first:

```bash
pnpm --filter @sellr/api media:retry-failed -- --dry-run
```

Queue retry jobs:

```bash
pnpm --filter @sellr/api media:retry-failed
```

Limit a batch:

```bash
pnpm --filter @sellr/api media:retry-failed -- --limit=25
```

Use this when `media:health` shows `delete_failed` records after a transient R2
or Railway issue has cleared.

## Failure Visibility

Railway logs and Sentry should surface structured context for:

- Resend email OTP send failures, using email hash and domain only.
- Twilio Verify send/check failures, using phone hash and last four digits only.
- R2 upload/delete failures, including bucket and storage key.
- Media cleanup worker failures, including media asset id, storage key, reason,
  and retry attempt count.
- API 500s by method, route, request id, status code, and user id when known.
- Refresh-token validation failures without logging token values.

Never log OTP codes, auth tokens, cookies, Resend API keys, Twilio auth tokens,
R2 secrets, full email addresses, or full phone numbers.

## Redeploy Safely

Railway API:

1. Confirm GitHub Actions `Deploy` has applied new Prisma migrations when a PR
   includes `apps/api/prisma/migrations`.
2. Redeploy the Railway API from latest `main`.
3. Check `/health`.
4. Check Railway logs for startup errors, Redis fallback errors, R2 errors, and
   unhandled API 500s.

Vercel web:

1. Confirm production env vars match `docs/deployment.md`.
2. Redeploy latest `main`.
3. Check `/api/v1/auth/me` returns `{"error":"Unauthorized"}` when logged out.
4. Confirm `https://sellr-ai.com` is the primary domain and `www` redirects to
   the chosen primary domain.
5. Smoke email OTP login, marketplace browse, listing upload, inbox,
   notifications, `/admin/community`, and `/admin/reports`.

## Common Incidents

Email OTP send fails:

- Confirm Railway has `RESEND_API_KEY` and `EMAIL_FROM`.
- Confirm `EMAIL_FROM` is `Sellr <verify@send.sellr-ai.com>` or another sender
  on a verified Resend sending domain.
- Confirm `EMAIL_OTP_ALLOWED_DOMAINS` includes the intended launch domain.
- Check Resend logs for delivery or domain-verification errors.

Twilio OTP send fails:

- Confirm Railway has `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
  `TWILIO_VERIFY_SERVICE_SID`.
- Confirm the Verify service belongs to the same Twilio account as the token.
- Check Twilio account SMS/geo permissions and account status.

R2 upload/delete fails:

- Confirm Railway has `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET_NAME`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_CDN_URL`.
- Confirm the R2 token is scoped to object read/write on the media bucket.
- Run `media:health`, then retry failed deletes after the underlying issue is
  fixed.

Admin report remove listing button is missing:

- Confirm Vercel production is deployed from latest `main`.
- Confirm the report target chip is `listing`.
- Open the target listing and verify it still exists.
