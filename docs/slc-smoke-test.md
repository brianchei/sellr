# Sellr Web SLC Smoke Test

Use this checklist after migrations and `pnpm --filter @sellr/api exec prisma db seed`.
It verifies the first working web SLC without relying on hand-created data.
The seed resets the local `Dev Campus` demo listings, conversations, and
reports, and notifications before recreating the canonical fixtures.
For the higher-level handoff checklist, see
[`slc-readiness.md`](./slc-readiness.md).

## Automated SLC Checks

With Redis, Supabase/Postgres, API, and web running:

```bash
pnpm smoke:auth-onboarding
pnpm smoke:seller
pnpm smoke:buyer
pnpm smoke:inbox
pnpm smoke:notifications
pnpm smoke:reports
pnpm smoke:web
```

For a full handoff gate that also resets seed data and runs focused lint,
typecheck, test, and build checks, run:

```bash
pnpm slc:ready
```

The auth/onboarding script confirms the logged-out auth state, checks `/login`
and `/onboarding` HTML responses, signs in with a local `@wisc.edu` email OTP,
resets the smoke user's community membership, joins by verified email domain,
and confirms the joined session reaches `/dashboard`.

The seller script signs in through the web `/api/v1` proxy, confirms
`/auth/me`, uploads a temporary listing image, creates a temporary listing,
publishes it, verifies it appears in seller inventory, updates it, unpublishes
it, and deletes it.

The buyer script signs in as the seeded seller and buyer, opens or reuses a
pre-offer conversation for an active seller listing, sends a buyer message, and
confirms both inboxes and message threads can see it.

The inbox script signs in as the seeded seller and buyer, sends messages from
both participants, verifies populated listing and peer context in each inbox,
checks archived filtering, and confirms a new peer reply restores an archived
thread to the active inbox.

The notifications script signs in as the seeded seller and buyer, creates real
message notifications, verifies unread filtering, marks one notification read,
and confirms mark-all-read clears remaining unread notification state.

The report script signs in as the seeded buyer, seller, and admin, submits a
real listing report, verifies the created report fields, and confirms the admin
reports API can review the submitted listing report.

The web script signs in through the same web proxy, opens or reuses the seeded
buyer/seller conversation, and verifies the authenticated HTML routes for
dashboard, marketplace, listing detail, seller storefront, inbox, thread,
notifications, sell, listings, and listing edit. It also signs in as the seeded
admin account and verifies the admin reports API and `/admin/reports` route.

Override the target with
`SELLR_SMOKE_API_BASE_URL=http://127.0.0.1:3001/api/v1` when you want to test
the API directly instead of the web proxy.

Override the web route target with
`SELLR_SMOKE_WEB_BASE_URL=http://localhost:3000` if the web app is served from a
different local origin.

Override the reusable onboarding email with
`SELLR_SMOKE_ONBOARDING_EMAIL=your-smoke-user@wisc.edu` when you need to avoid
local provider rate limits for repeated auth/onboarding runs.

## Browser Visual Pass

After the automated checks pass, review these routes at desktop and mobile
widths:

- `/marketplace`: filters, listing cards, loading/empty/error states.
- `/marketplace/[listingId]`: seller trust card, contact CTA, report action.
- `/sellers/[sellerId]`: seller trust signals, active listing cards, report
  seller action, contact-through-listing copy.
- `/dashboard`: seller readiness panel, profile preview, next best seller
  action, and community setup links.
- `/inbox` and `/inbox/[conversationId]`: conversation list, thread layout,
  message composer, report message action.
- `/notifications`: unread badge behavior, message/listing tabs, mark-read
  actions, and links back to inbox or listing detail.
- `/admin/reports`: report filters, status actions, target links, and
  non-admin restricted-access state.
- `/sell`: inline validation, file image upload, image preview, buyer preview
  panel.
- `/listings` and `/listings/[listingId]/edit`: status filters, notices,
  listing actions, edit form layout.

## Demo Accounts

Local email and SMS OTP accept `000000` when Resend/Twilio are not configured.
Email sign-in is the primary web path for the campus launch; phone sign-in
still supports existing demo accounts and invite-code fallback testing.
Use any `@wisc.edu` address to smoke the email-first onboarding path, then use
the seeded phone accounts below for the fixed buyer/seller/admin fixtures.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera
- Admin: `+15550000003` / Priya Shah
- Student email domain: `wisc.edu` for the seeded `Dev Campus`
- Community invite: `DEV2026`

## Happy Path

1. Start Redis, Supabase, API, and web.
2. Open `http://localhost:3000`.
3. Select the phone fallback and sign in as the buyer with OTP `000000`.
4. Join `DEV2026` if prompted.
5. Browse `/marketplace` and open `Walnut study desk`.
6. Confirm the listing detail shows seller trust signals, pickup area, availability, report listing, and a seller profile link.
7. Open the seller storefront and confirm active listings plus report seller/contact-through-listing guidance.
8. Send a message to the seller and open the conversation thread.
9. Confirm the inbox shows the seeded conversation and allows replies.
10. Sign out and sign in as the seller.
11. Open `/dashboard` and confirm seller readiness reflects listings, photos, buyer activity, and next action.
12. Open `/listings`.
13. Confirm active, draft, and sold demo listings are visible under their filters.
14. Create a new listing from `/sell` using a local image file, edit it, publish it, then mark it sold.
15. Confirm the sold listing leaves marketplace browse and appears in the Sold filter.
16. Sign in as the admin and open `/admin/reports` to review the seeded report.

## Email-First Onboarding Check

1. Sign out.
2. Open `/login`.
3. Enter any `@wisc.edu` email address.
4. Enter local OTP `000000`.
5. Join `Dev Campus` by verified email domain.
6. Confirm `/marketplace` loads without needing an invite code.

## Expected Local Notes

- The Sentry auth-token warning during local web builds is expected.
- If the API was already running before route edits, restart it before endpoint smoke tests.
- Databases without the optional `location_geom` column fall back to community-scoped listing results without distance ranking.
- Uploaded listing images use local API storage in development; production uses
  R2/CDN with async media lifecycle cleanup.
