# Sellr Current State And Scope

Last updated: May 12, 2026.

## Product Scope

Sellr is a trust-native local marketplace for verified, high-trust communities.
The current release scope is the web SLC/MVP: a complete buyer/seller loop for
local resale, with identity, proximity, availability, pickup coordination, and
basic safety primitives.

The initial launch community is `Badger Market` for UW-Madison students, but
Sellr itself remains a general community marketplace. UW-specific behavior is
scoped to the launch community gate and contextual onboarding guidance.

The Phase 1 web polish pass has shipped. The public landing page and
authenticated app now share the same refreshed Sellr design language: production
brand assets, metadata/icons, community-first landing copy, interactive product
preview, warm gradient shells, rounded elevated app panels, high-contrast
actions, and refreshed marketplace, listing, messaging, seller, admin, login,
and onboarding surfaces.

## Production State

Production is live on the custom domain stack:

```text
Web: https://sellr-ai.com
API: https://api.sellr-ai.com
Media CDN: https://cdn.sellr-ai.com
Email sender domain: send.sellr-ai.com
```

Backing provider URLs remain available for diagnostics and rollback:

```text
Vercel: https://sellr-web.vercel.app
Railway: https://api-production-be29.up.railway.app
```

Verified production checks:

- `https://api.sellr-ai.com/health` returns `ok`.
- `https://sellr-ai.com/api/v1/auth/me` returns the expected logged-out
  `Unauthorized` response through the same-origin Vercel rewrite.
- Resend email OTP works for verified `@wisc.edu` sign-in.
- `Badger Market` exists in production with `email_domain = wisc.edu`.
- Invite code `BADGER2026` works as the secondary join path.
- Listing image uploads return `https://cdn.sellr-ai.com` URLs.
- Listing detail, contact seller, inbox thread, notifications, and seller
  listing lifecycle checks passed in production.
- Test listing deletion/cleanup checks did not show Railway media cleanup
  errors during the smoke pass.

## Current Web SLC Surface

Included:

- Email-first OTP login through Resend, with Twilio phone fallback.
- Verified community onboarding through `wisc.edu` email domain or invite code.
- Marketplace browse/search/filter and listing detail pages.
- Structured listing creation with durable R2-backed photo upload.
- Listing edit, publish/unpublish, delete, and sold lifecycle.
- Seller storefront-lite pages with trust signals.
- Buyer contact, inbox threads, replies, notifications, and unread badges.
- Basic reporting plus admin-only report review and explicit listing removal.
- Admin-only community setup for invite codes and member role/status
  management.
- Dashboard profile/trust preview and seller readiness panel.
- Vercel Web Analytics and Speed Insights mounted in the web root layout.
- Media lifecycle cleanup for abandoned uploads, replaced/deleted listing
  images, and explicit admin listing removals.
- Refreshed public landing page and app-wide visual system for the Phase 1 web
  polish pass.
- Phase 2 identity hardening has shipped: web sessions rotate the refresh cookie
  when the short-lived access cookie expires, same-origin web API calls retry
  once after refresh-cookie rotation, phone fallback login uses US-default `+1`
  normalization, and listing post/contact seller actions require a real display
  name, verified contact method, and active community membership.
- Phase 2 also includes a dedicated `/profile` surface using existing app
  panel/form styling for display name, profile photo upload, verified contact
  display, storefront access, and readiness guidance. Account navigation,
  high-intent profile-completion CTAs, dashboard readiness guidance,
  seller-owned listing identity previews, and buyer-facing seller-card cache
  refreshes now connect into this profile surface.
- Phase 3 community product work has started with a quiet authenticated app-shell
  community indicator/switcher backed by active community summaries from
  `/auth/me`.

## Deliberately Deferred

Do not add these before launch unless explicitly requested:

- Payments, escrow, or delivery/logistics.
- Ratings, advanced reputation, advanced KYC, or complex moderation.
- Advanced AI/recommendations or growth loops.
- Native mobile parity and mobile polish.
- Broad admin tooling beyond current community/report management.
- Full API ESM production build migration.

## Immediate Launch Priorities

- Seed 25-40 high-quality active listings for the initial campus launch.
- Run a production visual smoke pass after the Phase 1 design refresh is
  deployed to `https://sellr-ai.com`.
- Confirm launch admin can access `/admin/community` and `/admin/reports`.
- Watch Railway logs and Resend logs during the first real-user wave.
- Run `pnpm --filter @sellr/api media:health` after early listing activity.
- Keep `sellr-web.vercel.app` and the Railway backing API URL available for
  diagnostics until the custom domain stack has had enough production traffic.
- Collect real launch proof, testimonials, approved member/seller photos,
  campus imagery, and seed-listing imagery before adding them to the public
  landing page.
