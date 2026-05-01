# Sellr Web SLC Smoke Test

Use this checklist after migrations and `pnpm --filter @sellr/api exec prisma db seed`.
It verifies the first working web SLC without relying on hand-created data.

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
