# Sellr Web

`apps/web` is the Next.js 16 App Router web SLC for Sellr. It uses React 19,
Tailwind CSS 4, httpOnly cookie auth through same-origin `/api/v1` rewrites,
React Query, and typed helpers from `@sellr/api-client`.

## Current SLC Routes

- `/login`: phone OTP sign-in for web cookie sessions.
- `/onboarding`: join a verified community with an invite code or email.
- `/dashboard`: profile editor, trust preview, seller readiness panel, and next
  best action.
- `/marketplace`: community-scoped browse, search, filters, and listing cards.
- `/marketplace/[listingId]`: listing detail, seller trust card, contact seller,
  and report listing.
- `/sellers/[sellerId]`: seller storefront-lite with trust signals, active
  listings, report seller action, and contact-through-listing guidance.
- `/sell`: structured listing creation with local file image upload and buyer
  preview.
- `/listings`: seller inventory management, status filters, publish/unpublish,
  delete, and mark sold.
- `/listings/[listingId]/edit`: owner-only listing edit flow.
- `/inbox` and `/inbox/[conversationId]`: buyer/seller conversation list,
  message thread, reply composer, and report message.
- `/notifications`: activity center with unread/listing/message filters and
  mark-read actions.
- `/admin/reports`: admin-only report review and status updates.

## Local Development

From the repository root:

```bash
pnpm env:web
pnpm --filter @sellr/web dev
```

The app expects the API to be available through the local rewrite at
`http://localhost:3000/api/v1`. In the normal local stack, run the API dev server
on `http://localhost:3001`.

## Verification

Useful focused checks:

```bash
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
```

For a full SLC handoff gate from the repository root:

```bash
pnpm slc:ready
```

See `../../docs/slc-readiness.md` and `../../docs/slc-smoke-test.md` for the
full readiness and smoke-test workflow.
