# Sellr Launch Release Checklist

Use this as the canonical pre-launch and release-day checklist for the current
web SLC. It links to the deeper runbooks, but this file should be the first
place an operator looks when preparing or approving a launch release.

Do not add Phase 6 AI, payments, ratings, delivery/logistics, broad growth
loops, or new platform dependencies as part of this checklist. Those are
outside the current launch scope.

## 1. Confirm Release Scope

Before deploying or starting a launch window:

1. Confirm the release only changes launch-approved SLC surfaces:
   auth, onboarding, marketplace browse, listing detail, listing lifecycle,
   media upload/cleanup, messaging, notifications, reports/admin, deployment
   config, or launch docs.
2. Confirm GitHub `main` is protected and the release branch has a PR.
3. Confirm the PR does not add migrations, dependencies, or environment
   variables unless those are explicitly called out in the PR.
4. Confirm any database migration has passed the GitHub Actions production
   migration check before treating the release as launch-ready.
5. Confirm no secrets, OTP codes, cookies, auth tokens, private pickup details,
   full emails, or full phone numbers were copied into docs, tickets, or chat.

## 2. Pre-Deploy Checks

Run from the repository root when the local environment has the project package
manager available:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm slc:ready
```

If a local package-manager issue prevents a command from running, document that
blocker in the PR and rely on GitHub Actions for the missing check. Do not mark
the release ready until CI covers the gap.

For web-only UI changes, the minimum focused checks are:

```bash
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
```

## 3. Provider And Environment Preflight

Confirm the production provider state matches [`deployment.md`](./deployment.md):

1. Railway API deploys from latest `main`.
2. Vercel web deploys from latest `main`.
3. Supabase production database is healthy.
4. Railway Redis is connected through `REDIS_URL`.
5. Vercel `INTERNAL_API_URL` is `https://api.sellr-ai.com`.
6. Vercel same-origin API rewrites remain enabled.
7. Railway `ALLOWED_ORIGINS` includes `https://sellr-ai.com`,
   `https://www.sellr-ai.com`, and `https://sellr-web.vercel.app`.
8. Railway Resend variables are present for email OTP.
9. Railway R2 variables are present for listing media.
10. `send.sellr-ai.com` is verified in Resend.
11. `cdn.sellr-ai.com` serves listing media URLs.
12. Backing URLs remain available for diagnostics:
    `https://sellr-web.vercel.app` and
    `https://api-production-be29.up.railway.app`.

## 4. Seed And Community Readiness

Before opening the release to real users:

1. Confirm `Badger Market` is active with `email_domain = wisc.edu`.
2. Confirm invite code `BADGER2026` exists as a secondary join path.
3. Confirm a launch admin can access `/admin/community` and `/admin/reports`.
4. Seed or review 25-40 high-quality active listings.
5. Run inventory readiness:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --strict
```

Use [`launch-inventory-readiness.md`](./launch-inventory-readiness.md) to fix
blocking listing, seller, photo, category, pickup-area, or quality issues.

## 5. Deploy And Public Smoke

After the release reaches production:

1. Confirm GitHub Actions `ci` and `Deploy` passed.
2. Confirm Railway API deploy is healthy.
3. Confirm Vercel production deploy is healthy.
4. Run the safe public smoke:

```bash
pnpm smoke:production-public
```

5. If custom domains fail, compare with backing provider URLs before changing
   app code.

The public smoke checks API health, same-origin auth rewrite behavior, and key
logged-out HTML routes. It is safe to run repeatedly because it does not create
users, listings, messages, or reports.

## 6. Authenticated Launch Smoke

Run the full operator smoke in
[`launch-smoke-checklist.md`](./launch-smoke-checklist.md) for releases that
touch auth, onboarding, listings, uploads, messaging, reports/admin,
notifications, provider configuration, or database migrations.

At minimum, confirm:

1. A planned `@wisc.edu` smoke account can receive and verify email OTP.
2. The smoke account can join or access `Badger Market`.
3. Marketplace browse shows active listings with photos and trust cues.
4. Listing detail shows item photos, seller context, pickup guidance, report
   action, and buyer contact path.
5. A temporary smoke listing can be created with a real image.
6. The image loads from `https://cdn.sellr-ai.com`.
7. Listing edit, replacement image, sold state, and deletion still work.
8. Buyer contact creates a conversation.
9. Inbox and notifications show the new activity.
10. A submitted report appears in `/admin/reports` for an active admin.
11. Admin listing removal works only on a disposable smoke listing.

Delete disposable smoke listings and reports when the test is done.

## 7. Media Health

Run media health after upload, edit, deletion, or admin-removal smoke has had
time to queue cleanup:

```bash
pnpm --filter @sellr/api media:health
```

Healthy launch expectations:

- `delete_failed` should be `0`, or explained and actively remediated.
- Expired `pending` media should clear after delayed jobs or cleanup catch-up.
- Active listing images should continue to load from the CDN.
- Do not roll back solely for async deletion backlog if active images load and
  failed deletes can be retried.

Use [`production-runbook.md`](./production-runbook.md) for cleanup and retry
commands.

## 8. Active Launch Watch

Use [`launch-monitoring.md`](./launch-monitoring.md) during the first real-user
wave and after high-risk deploys.

Required watch surfaces:

1. GitHub Actions `ci` and `Deploy`.
2. Railway API deploy, `/health`, logs, Redis, worker, R2, Resend, and API 500s.
3. Vercel deploy status, function errors, rewrite failures, analytics, and web
   vitals.
4. Resend domain verification and email OTP events.
5. Cloudflare R2/CDN object access and listing image availability.
6. Supabase health, connections, slow queries, and migration status.
7. Redis/BullMQ connectivity, queue backlog, and notification/media jobs.

Keep watching continuously for the first 60 minutes, then recheck every 30
minutes for the next 2 hours. Extend the watch while any P0 or P1 incident is
open.

## 9. Go, Hold, Or Roll Back

Go when:

- Public smoke passes.
- Authenticated smoke passes for the touched flows.
- Inventory readiness passes strict mode.
- Media health has no unexplained failures.
- Admin/community access works.
- No active P0 or unresolved launch-blocking P1 incidents remain.

Hold when:

- CI or production migration checks are failing.
- Email OTP, community join, marketplace browse, listing upload, buyer contact,
  inbox, notifications, or reports/admin are unreliable.
- Provider dashboards show unexplained repeated errors.

Roll back or redeploy immediately when:

- A deploy blocks login, browse, listing upload, buyer contact, or admin
  reports.
- A migration or environment change breaks community-scoped access.
- A Vercel build bakes an incorrect API or realtime origin.
- New listing uploads produce broken public CDN URLs.

## 10. Evidence To Save

Record the release evidence in the PR, launch note, or internal operator log:

- Date, operator, PR, deployed commit, and environment.
- CI, deploy, and migration check results.
- Public smoke command output.
- Inventory readiness output.
- Media health output.
- Email OTP success without exposing the OTP.
- Listing CDN URL for the smoke listing.
- Conversation id and notification result for the buyer contact smoke.
- Report id and final status for the admin smoke.
- Any incidents, provider surface, start/end time, and resolution.

Do not record OTP codes, cookies, auth tokens, API keys, full email addresses,
full phone numbers, private pickup details, or raw user message content.

## Reference Runbooks

- [`deployment.md`](./deployment.md): provider topology and required variables.
- [`production-runbook.md`](./production-runbook.md): health, media cleanup,
  redeploy, and incident steps.
- [`launch-smoke-checklist.md`](./launch-smoke-checklist.md): detailed
  authenticated and mutable smoke path.
- [`launch-monitoring.md`](./launch-monitoring.md): watch windows, thresholds,
  provider surfaces, response playbooks, and rollback signals.
- [`launch-inventory-readiness.md`](./launch-inventory-readiness.md): seed
  inventory quality checks and fixes.
