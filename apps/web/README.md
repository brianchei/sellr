# Sellr Web

`apps/web` is the Next.js 16 App Router web SLC for Sellr. It uses React 19,
Tailwind CSS 4, httpOnly cookie auth through same-origin `/api/v1` rewrites,
React Query, and typed helpers from `@sellr/api-client`.

## Current SLC Routes

- `/`: refreshed public landing page with community-first positioning,
  production brand assets, interactive Sellr app preview, launch access copy,
  trust commitments, FAQ, and final CTA.
- `/login`: email OTP sign-in for web cookie sessions, with phone OTP fallback.
- `/onboarding`: join a verified community with a verified email domain or an
  invite code.
- `/dashboard`: profile editor, trust preview, seller readiness panel, and next
  best action.
- `/profile`: dedicated profile management with display name editing, profile
  photo upload, verified contact display, storefront access, and readiness
  guidance.
- `/communities/[communityId]`: member-only community homepage with membership
  context, marketplace stats, recent listing previews, lightweight Badger/campus
  presentation cues, guidance, and scoped browse/sell actions.
- `/communities/join`: post-login flow for joining another community with an
  invite code or verified email-domain match.
- `/admin/community`: admin invite/member management with a
  management-community switcher for admins who operate multiple communities.
- `/marketplace`: community-scoped browse, search, filters, and listing cards.
- `/marketplace/[listingId]`: listing detail, seller trust card, contact seller,
  and report listing.
- `/sellers/[sellerId]`: seller storefront-lite with trust signals, active
  listings, report seller action, and contact-through-listing guidance.
- `/sell`: structured listing creation with file image upload, durable
  production media delivery, and buyer preview.
- `/listings`: seller inventory management, status filters, publish/unpublish,
  delete, mark sold, and seller identity preview.
- `/listings/[listingId]/edit`: owner-only listing edit flow.
- `/inbox` and `/inbox/[conversationId]`: buyer/seller conversation list,
  message thread, reply composer, and report message.
- `/notifications`: activity center with unread/listing/message filters and
  mark-read actions.
- `/admin/reports`: admin-only report review, status updates, and explicit
  listing removal for listing reports.

## Local Development

From the repository root:

```bash
pnpm env:web
pnpm --filter @sellr/web dev
```

The app expects the API to be available through the local rewrite at
`http://localhost:3000/api/v1`. In the normal local stack, run the API dev server
on `http://localhost:3001`.

## Production Deployment

The recommended production host for the web SLC is Vercel. Use `apps/web` as
the project root and keep browser API calls same-origin so httpOnly auth cookies
work correctly.

Required production web variables:

```text
INTERNAL_API_URL=https://api.sellr-ai.com
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api.sellr-ai.com
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr-ai.com
NEXT_PUBLIC_SITE_URL=https://sellr-ai.com
```

Resend and Twilio variables belong on the Railway API service, not in the web
project. See `../../docs/email-first-auth.md` for the email OTP setup.

Do not include `/api/v1` in `INTERNAL_API_URL`; `next.config.ts` appends that
path in the rewrite.

Do not set `NEXT_PUBLIC_API_URL` for the normal web deployment unless the auth
flow is intentionally changed away from same-origin cookie sessions.

After Vercel creates the web origin, add it to the Railway API service:

```text
ALLOWED_ORIGINS=https://sellr-ai.com,https://www.sellr-ai.com,https://sellr-web.vercel.app
```

Vercel Web Analytics and Speed Insights are mounted in `app/layout.tsx`; enable
the matching dashboard-side Vercel features for the project if metrics are not
appearing.

See `../../docs/deployment.md` for the full deployment notes.

## Web Design System

The Phase 1 web polish pass is reflected in `app/globals.css` and shared
components:

- Public landing uses the community marketplace story, Figma-inspired visual
  rhythm, gradients, and `components/landing-app-preview.tsx`.
- Authenticated surfaces use `app-shell-bg`, `app-panel`, `app-panel-soft`,
  `app-chip`, `app-action-primary`, and `app-action-secondary`.
- App surfaces should preserve the refreshed modern marketplace language while
  staying task-focused: clear hierarchy, honest trust cues, compact metadata,
  and no decorative controls that do not work.

See `../../docs/design-language.md` and
`../../docs/web-next-development-guide.md` before adding new web surfaces.

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
