# Sellr Launch Smoke Checklist

Use this after production deploys that touch auth, onboarding, marketplace,
listing lifecycle, media upload, messaging, reports/admin, notifications,
environment variables, custom domains, or database migrations.

For release-day ordering, start with
[`launch-release-checklist.md`](./launch-release-checklist.md), then use this
file for the detailed authenticated and mutable smoke steps.

The checklist has two layers:

- Safe public checks that can run any time.
- Authenticated and mutable checks that should use a planned smoke account and
  a temporary listing.

## 1. Safe Public Smoke

Run from the repository root:

```bash
pnpm smoke:production-public
```

Override origins when testing backing provider URLs or a preview stack:

```bash
SELLR_PROD_WEB_ORIGIN=https://sellr-web.vercel.app \
SELLR_PROD_API_ORIGIN=https://api-production-be29.up.railway.app \
pnpm smoke:production-public
```

This verifies:

- `https://api.sellr-ai.com/health` returns `status=ok`.
- `https://sellr-ai.com/api/v1/auth/me` returns logged-out `Unauthorized`
  through the Vercel same-origin rewrite.
- `/`, `/login`, `/onboarding`, and `/marketplace` return HTML without generic
  application errors.

## 2. Operator Preflight

Before using real smoke accounts:

1. Confirm latest GitHub Actions `ci` and `Deploy` checks passed.
2. Confirm Vercel production env vars match `docs/deployment.md`.
3. Confirm Railway API env vars match `docs/deployment.md`.
4. Confirm `Badger Market` is active with `email_domain = wisc.edu`.
5. Confirm invite code `BADGER2026` exists as a secondary join path.
6. Run launch inventory readiness:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --strict
```

7. Run media health:

```bash
pnpm --filter @sellr/api media:health
```

## 3. Auth And Onboarding

Use a planned `@wisc.edu` smoke account, not a personal account:

1. Open `https://sellr-ai.com/login`.
2. Request an email OTP for the smoke account.
3. Verify the OTP from Resend.
4. Confirm the session reaches `/onboarding` or `/dashboard`.
5. If the smoke account is not already a member, join `Badger Market` by email
   domain.
6. Confirm `/dashboard` shows active community context and no readiness dead
   end.
7. Optional: verify phone fallback only if Twilio fallback is part of the
   release being checked.

## 4. Marketplace And Listing Detail

1. Open `/marketplace`.
2. Confirm active listings render with photos, prices, condition, pickup area,
   and seller trust cues.
3. Use search plus at least one filter.
4. Open three listings across different categories.
5. Confirm each detail page shows item photos, seller context, pickup/privacy
   guidance, report action, and a clear contact path.
6. Confirm sold or unavailable listings do not invite buyer contact.

## 5. Listing Lifecycle And CDN Upload

Use a temporary smoke listing title that includes the date, such as
`Smoke listing YYYY-MM-DD`.

1. Open `/sell`.
2. Upload a real local image.
3. Confirm upload feedback succeeds and preview renders.
4. Save/publish the listing.
5. Confirm the listing appears in `/listings`.
6. Open the listing detail page and confirm the image URL uses
   `https://cdn.sellr-ai.com`.
7. Edit the listing and replace the image.
8. Confirm the replacement image loads.
9. Mark the listing sold.
10. Confirm it leaves marketplace browse and appears in the Sold inventory
    filter.
11. Delete the temporary listing.
12. Run `media:health` after cleanup has had time to process.

## 6. Buyer Contact, Inbox, And Notifications

Use a buyer account that does not own the selected listing:

1. Open an active listing.
2. Send a concise buyer contact message.
3. Confirm the success state links to the conversation.
4. Open `/inbox` and the new thread.
5. Confirm listing context, seller identity, message history, report/archive
   actions, and reply composer render.
6. Reply as the seller or confirm the seller account sees the thread.
7. Confirm `/notifications` shows the relevant message notification.
8. Mark one notification read, then run mark-all-read if unread notifications
   remain.

## 7. Reports And Admin

Use an admin account with active admin membership in `Badger Market`:

1. Submit a listing report from a non-owner buyer account.
2. Open `/admin/reports`.
3. Confirm the submitted report appears with listing/member context.
4. Move the report through the expected status action, or resolve it if it was
   created only for smoke.
5. For one disposable listing report only, use **Remove listing** and confirm:
   the listing is removed from browse, the report is resolved, and media cleanup
   is queued.
6. Open `/admin/community`.
7. Confirm invite/member management loads and the launch admin is not blocked.

## 8. Evidence To Record

Record the date, operator, environment, and result for:

- Public smoke command output.
- Inventory readiness output.
- Media health output.
- Email OTP success.
- Listing image CDN URL.
- Buyer/seller thread id.
- Notification read/clear result.
- Admin report id and final status.
- Any Railway, Vercel, Resend, Twilio, Supabase, or R2 errors observed.

Do not record OTP codes, cookies, auth tokens, API keys, full phone numbers, or
private pickup details.

## Pass Criteria

Launch smoke passes when:

- Public web/API origins are healthy.
- Email OTP and community access work.
- Marketplace has enough trustworthy active inventory.
- Listing upload, edit, sold, delete, and CDN media behavior work.
- Buyer contact creates a usable inbox thread and notification.
- Reports are visible to an active community admin.
- Media health has no unresolved `delete_failed` records and no unexpected
  expired pending backlog.
