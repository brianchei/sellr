# Sellr Web SLC Smoke Test

Use this checklist after migrations and `pnpm --filter @sellr/api exec prisma db seed`.
It verifies the first working web SLC without relying on hand-created data.
The seed resets the local `Dev Campus` demo listings, conversations, and
reports before recreating the canonical fixtures.
For the higher-level handoff checklist, see
[`slc-readiness.md`](./slc-readiness.md).

## Automated SLC Checks

With Redis, Supabase/Postgres, API, and web running:

```bash
pnpm smoke:seller
pnpm smoke:buyer
pnpm smoke:web
```

The seller script signs in through the web `/api/v1` proxy, confirms
`/auth/me`, creates a temporary listing, publishes it, verifies it appears in
seller inventory, updates it, unpublishes it, and deletes it.

The buyer script signs in as the seeded seller and buyer, opens or reuses a
pre-offer conversation for an active seller listing, sends a buyer message, and
confirms both inboxes and message threads can see it.

The web script signs in through the same web proxy, opens or reuses the seeded
buyer/seller conversation, and verifies the authenticated HTML routes for
marketplace, listing detail, inbox, thread, sell, listings, and listing edit.

Override the target with
`SELLR_SMOKE_API_BASE_URL=http://127.0.0.1:3001/api/v1` when you want to test
the API directly instead of the web proxy.

Override the web route target with
`SELLR_SMOKE_WEB_BASE_URL=http://localhost:3000` if the web app is served from a
different local origin.

## Browser Visual Pass

After the automated checks pass, review these routes at desktop and mobile
widths:

- `/marketplace`: filters, listing cards, loading/empty/error states.
- `/marketplace/[listingId]`: seller trust card, contact CTA, report action.
- `/inbox` and `/inbox/[conversationId]`: conversation list, thread layout,
  message composer, report message action.
- `/sell`: inline validation, image preview, buyer preview panel.
- `/listings` and `/listings/[listingId]/edit`: status filters, notices,
  listing actions, edit form layout.

## Demo Accounts

Local OTP accepts `000000`.

- Seller: `+15550000001` / Maya Chen
- Buyer: `+15550000002` / Jordan Rivera
- Community invite: `DEV2026`

## Happy Path

1. Start Redis, Supabase, API, and web.
2. Open `http://localhost:3000`.
3. Sign in as the buyer with OTP `000000`.
4. Join `DEV2026` if prompted.
5. Browse `/marketplace` and open `Walnut study desk`.
6. Confirm the listing detail shows seller trust signals, pickup area, availability, and report listing.
7. Send a message to the seller and open the conversation thread.
8. Confirm the inbox shows the seeded conversation and allows replies.
9. Sign out and sign in as the seller.
10. Open `/listings`.
11. Confirm active, draft, and sold demo listings are visible under their filters.
12. Create a new listing from `/sell`, edit it, publish it, then mark it sold.
13. Confirm the sold listing leaves marketplace browse and appears in the Sold filter.

## Expected Local Notes

- The Sentry auth-token warning during local web builds is expected.
- If the API was already running before route edits, restart it before endpoint smoke tests.
- Databases without the optional `location_geom` column fall back to community-scoped listing results without distance ranking.
