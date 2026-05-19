# Sellr Launch Monitoring

Use this during the initial campus launch and after production changes that
touch auth, onboarding, marketplace browse, listing media, messaging,
notifications, reports/admin, or environment variables.

For release-day ordering, start with
[`launch-release-checklist.md`](./launch-release-checklist.md), then use this
file for watch windows, thresholds, provider surfaces, and incident response.

This is a lightweight operator runbook, not a new monitoring platform. Prefer
existing provider dashboards, structured logs, and the production smoke commands
until launch traffic proves a need for more automation.

## Watch Windows

Use a short active watch window for the first real-user wave:

1. Start watching 15 minutes before the announced launch or test cohort window.
2. Run the public smoke command once before the window opens.
3. Watch provider dashboards and logs continuously for the first 60 minutes.
4. Recheck every 30 minutes for the next 2 hours.
5. Run the public smoke command again after any Railway or Vercel redeploy.

Extend the window when any P0 or P1 incident is open.

## Baseline Commands

Run from the repository root:

```bash
pnpm smoke:production-public
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --strict
pnpm --filter @sellr/api media:health
```

Use the full authenticated checklist in
[`launch-smoke-checklist.md`](./launch-smoke-checklist.md) after deploys that
touch user flows or when provider signals suggest a user-facing issue.

## Provider Surfaces

GitHub Actions:

- `ci` and `Deploy` must pass before a production release is treated as ready.
- Failed production migration checks are P0 until investigated.

Railway API:

- Watch deploy status, `/health`, restart loops, memory/CPU spikes, Redis
  connection failures, R2 failures, Resend failures, Twilio fallback failures,
  API 500s, and BullMQ worker errors.
- Search logs by request id, route, status code, media asset id, storage key,
  email domain, and hashed email/phone identifiers when available.

Vercel web:

- Watch deployment status, function errors, rewrite failures, 5xx responses,
  Web Analytics, and Speed Insights.
- Check same-origin `/api/v1/auth/me` when rewrites or API origin variables
  change.

Resend:

- Watch email OTP accepted, delivered, bounced, and blocked events.
- Confirm `send.sellr-ai.com` stays verified before launch mail starts.

Cloudflare R2/CDN:

- Watch object write/read errors, CDN URL availability, and media health output.
- Treat new `delete_failed` media as a queue to investigate, not as user-facing
  loss unless images also fail to load.

Supabase:

- Watch database availability, connection saturation, slow queries, and failed
  production migrations.

Redis/BullMQ:

- Watch worker connectivity, queue backlog, delayed media cleanup jobs, and
  notification job failures.

## Alert Thresholds

P0, page immediately:

- Public API `/health` is unavailable or returns non-OK for more than 2 minutes.
- `sellr-ai.com` cannot load the logged-out home, login, or marketplace routes.
- Same-origin `/api/v1` rewrite returns a generic Vercel/Railway error.
- Email OTP sends fail for multiple `@wisc.edu` attempts.
- Production migration fails or API deploy enters a restart loop.
- Community-scoped auth leaks data across communities.

P1, investigate during watch window:

- Buyer contact, inbox, notifications, or listing upload fails for a smoke
  account.
- R2 uploads succeed but CDN images fail to load.
- `media:health` reports any `delete_failed` records after a retry window.
- Redis/BullMQ disconnects cause notification or cleanup job failures.
- Report/admin routes fail for an active admin account.
- Vercel or Railway 5xx errors repeat on the same route within 10 minutes.

P2, log and schedule:

- Web vitals degrade without obvious user-facing failure.
- Inventory readiness warnings appear but strict mode still passes.
- Isolated email bounce or blocked event for a non-launch domain.
- Minor copy, spacing, or non-blocking UI polish issues found during smoke.

## Response Playbooks

Public smoke fails:

1. Compare custom domains with backing provider URLs.
2. Check Vercel deployment status and `INTERNAL_API_URL`.
3. Check Railway deployment status and `/health`.
4. If custom domains fail but backing URLs work, inspect Cloudflare DNS and
   provider domain verification.

Email OTP fails:

1. Check Railway `RESEND_API_KEY`, `EMAIL_FROM`, and
   `EMAIL_OTP_ALLOWED_DOMAINS`.
2. Check Resend domain verification and event logs.
3. Confirm the account email belongs to the allowed launch domain.
4. Use phone fallback only if the release specifically requires Twilio smoke.

Listing image upload or CDN load fails:

1. Check Railway R2 variables and recent API logs for upload/delete errors.
2. Confirm the returned listing image URL uses `https://cdn.sellr-ai.com`.
3. Run `media:health`.
4. Retry failed deletes only after the underlying R2/Railway issue has cleared.

Messaging or notification fails:

1. Confirm buyer and seller are in the same active community.
2. Check API logs for conversation, notification, Redis, and Socket.IO errors.
3. Confirm `/inbox` renders the thread after a hard refresh.
4. Check `/notifications` for the persisted notification before debugging
   realtime freshness.

Admin/report flow fails:

1. Confirm the account has active admin membership in `Badger Market`.
2. Check `/admin/community` before `/admin/reports` to separate auth from report
   data issues.
3. If **Remove listing** fails, verify the target listing still exists and
   inspect media cleanup logs.

## Evidence To Record

For each watch window, record:

- Date, operator, deployed commit or PR, and environment.
- Public smoke command result.
- Inventory readiness result.
- Media health result.
- Any P0/P1 incidents, start/end time, provider surface, and resolution.
- Affected route, request id, report id, conversation id, or media asset id when
  useful.
- Whether a rollback, redeploy, env correction, or data correction was needed.

Do not record OTP codes, cookies, auth tokens, API keys, full email addresses,
full phone numbers, private pickup details, or raw user message content.

## Rollback Signals

Consider rollback or immediate redeploy when:

- A deploy introduces repeated API 500s or route crashes that block login,
  browse, listing upload, buyer contact, or admin reports.
- A new migration or env change breaks community-scoped access.
- A web deploy bakes an incorrect API or realtime origin.
- Listing media uploads produce broken public CDN URLs for new listings.

Do not roll back solely for asynchronous media deletion backlog if active
listing images still load and `media:retry-failed` can repair cleanup later.
