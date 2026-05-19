# Sellr Current State And Scope

Last updated: May 17, 2026.

## Product Scope

Sellr is a trust-native local marketplace for verified, high-trust communities.
The current release scope is the web SLC/MVP: a complete buyer/seller loop for
local resale, with identity, proximity, availability, pickup coordination, and
basic safety primitives.

The initial launch community is `Badger Market` for UW-Madison students, but
Sellr itself remains a general community marketplace. UW-specific behavior is
scoped to the launch community gate and contextual onboarding guidance.

The Phase 1 web polish pass has shipped. The public landing page and
authenticated app share the refreshed Sellr design language: production brand
assets, metadata/icons, community-first landing copy, interactive product
preview, high-contrast actions, and refreshed marketplace, listing, messaging,
seller, admin, login, and onboarding surfaces.

The Pre-Phase-6 UI/UX overhaul has progressed beyond the initial foundation
pass. The shipped route-level passes now cover onboarding/auth entry, app
navigation, signed-in home/dashboard, marketplace browse/filter density,
listing detail contact hierarchy, listing creation/edit hierarchy, seller
inventory lifecycle, inbox item/thread hierarchy, notifications, admin density,
and profile/storefront trust hierarchy. Phase F closeout for the current web
SLC is now effectively complete: documentation alignment, responsive route
smoke, accessibility/state review, and SLC readiness verification have all been
run. Use [`ui-ux-overhaul-guide.md`](./ui-ux-overhaul-guide.md) as the source
of truth for what is complete versus deferred.

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
- The Phase 1 production visual smoke pass completed successfully across the
  public, core authenticated, and admin web surfaces.
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
- Marketplace browse/search/filter with server-backed category, condition,
  photo-only, price range, pickup-radius, and sort controls, scan-friendly
  listing cards, and listing detail pages with top-level seller/trust context
  and buyer-friendly pickup timing.
- Structured listing creation with durable R2-backed photo upload, listing
  strength guidance, browser-converted iPhone HEIC upload support where
  available, quick-pick price/pickup helpers, buyer preview, and mile-based
  pickup radius labels.
- Listing edit, publish/unpublish, delete, and sold lifecycle.
- Seller storefront-lite pages with trust signals.
- Buyer contact, inbox threads, replies, notifications, and unread badges.
- Basic reporting plus admin-only report review and explicit listing removal.
- Admin-only community setup for community details, invite codes, and member
  role/status management, with an explicit management-community switcher for
  admins who operate more than one community.
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
- Phase 3 community product work has shipped with a quiet authenticated app-shell
  community indicator/switcher backed by active community summaries from
  `/auth/me`, plus a member-only `/communities/[communityId]` homepage for
  community details, membership context, stats, guidance, recent listings, and
  browse/sell actions scoped to that community. The homepage now applies
  lightweight Badger Market/campus presentation cues for UW-style copy, pickup
  guidance, local-area chips, and trust highlights without adding a full
  theming system. Existing members can also use `/communities/join` to join
  another community, refresh membership context, switch to the joined community,
  and continue to its homepage. Members can leave a community from its homepage
  after unpublishing active listings, or confirm removal of their active/draft
  listings as part of the leave flow. Admins with multiple active admin
  memberships can switch the selected management community on `/admin/community`
  and edit basic community details, access method, email domain, member-facing
  rules/guidance, and lightweight presentation config for descriptions, accent
  color, local areas, pickup guidance, and optional approved imagery URLs. The
  admin member list supports search, role/status filters, clearer access action
  labels, inactive-access reason context, and empty states for larger
  communities. The reports dashboard now surfaces target member context, links
  admins into the relevant community/member management view, lets admins demote
  reported admins or deactivate/suspend member access from report cards, and
  records audit-friendly moderation history while keeping report status review
  separate.
- Phase 5 trust, moderation, and messaging work is complete for the current web
  SLC. Users can archive/hide conversations from the active inbox without
  deleting shared history, restore archived threads, and receive them back in
  the active inbox when a new message arrives. Admin report/member moderation
  remains explicit and audit-friendly, and profile/listing/storefront/inbox
  trust language now uses consistent backed signals such as verified contact,
  active community membership, profile photo presence, and active listings.

## Next Product Priority

The Pre-Phase-6 UI/UX overhaul is closed for the current web SLC. The core route
implementation passes through Phase E are shipped on `main`, and Phase F
closeout checks have run. Avoid starting another broad "next slice" unless a
fresh audit finds a concrete regression. Remaining work is optional or
asset-dependent:

- Capture authenticated no-community onboarding visual QA only if final signoff
  requires a fresh screenshot.
- Add a seeded incomplete-profile visual Browser smoke only if a launch fixture
  is added.
- Rerun `pnpm slc:ready` plus focused web lint/typecheck/test/build checks only
  after additional code changes, or document any environment blockers.
- Add real launch proof, testimonials, statistics, and approved imagery only
  after those assets exist and are approved.

May 17 Phase F progress: a desktop/mobile Browser route smoke covered the main
public, buyer/seller, profile/storefront, and admin routes; focused web checks
passed; and `pnpm slc:ready` passed locally outside the sandbox after fixing the
authenticated web smoke to support multi-community demo users. A follow-up
hardened report dialog focus, keyboard containment, validation, and success
focus with component tests and a buyer-visible listing Browser smoke. Another
follow-up hardened non-own listing contact-send and profile-readiness gates with
page-level tests, retryable profile-check failure UI, API-error clearing on
message edits, and a Browser smoke through `Message sent`. A report follow-up
added `pnpm smoke:reports` to submit a real listing report through the API and
verify admin review visibility; it now runs inside `pnpm slc:ready`. An inbox
follow-up added `pnpm smoke:inbox` for populated buyer/seller thread replies,
archive filtering, and reply-driven restoration to the active inbox; it also
runs inside `pnpm slc:ready`. A notifications follow-up added
`pnpm smoke:notifications` for real message notifications, unread filtering,
individual mark-read, and mark-all-read; it also runs inside
`pnpm slc:ready`, and Browser smoke covered populated `/notifications` at
desktop and mobile widths. An auth/onboarding follow-up added
`pnpm smoke:auth-onboarding` for logged-out auth state, email OTP sign-in,
email-domain onboarding, and dashboard reachability; it also runs inside
`pnpm slc:ready`, and Browser smoke covered the logged-out `/login` entry
screen. A populated inbox/thread desktop rendered smoke used the local
`pnpm smoke:inbox` fixture, signed in as the buyer through the phone fallback,
and verified `/inbox` plus the latest thread in Arc/Computer Use: the populated
conversation row, item context, seller trust summary, report/archive actions,
message history, pickup safety copy, quick replies, and empty-reply disabled
state rendered without obvious clipping or horizontal overflow. The mobile
rendered pass then used the in-app Browser at 390px, signed in as the same buyer,
verified populated `/inbox`, opened the latest Walnut study desk thread, checked
item/seller trust context, message history, pickup safety, quick replies,
empty-reply disabled state, and confirmed a quick reply fills the composer and
enables send without horizontal overflow or console warnings. The final
accessibility/state audit found and fixed one concrete login gap: invalid
email/code states now connect the visible error alert to the active input with
`aria-describedby`, with focused web tests covering the repair. The same pass
reran `pnpm slc:ready` successfully after a transient authenticated-route smoke
failure cleared on isolated rerun. Optional launch-evidence risks are
authenticated no-community onboarding visual QA if final signoff requires a
fresh screenshot and a seeded incomplete-profile visual Browser smoke if a
launch fixture is added.

## Deliberately Deferred

Do not add these before launch unless explicitly requested:

- Payments, escrow, or delivery/logistics.
- Ratings, advanced reputation, advanced KYC, or complex moderation.
- Advanced AI/recommendations or growth loops. Phase 6 AI listing assistance is
  also deferred until the UI/UX overhaul is complete.
- Native mobile parity and mobile polish.
- Broad admin tooling beyond current community/report management.
- Full API ESM production build migration.

## Immediate Launch Priorities

- Seed 25-40 high-quality active listings for the initial campus launch.
- Run `pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market"`
  after seed inventory updates.
- Confirm launch admin can access `/admin/community` and `/admin/reports`.
- Run `pnpm smoke:production-public` after deploys that touch custom domains,
  auth rewrites, or public routes.
- Use `docs/launch-monitoring.md` for first-wave watch windows, alert
  thresholds, evidence rules, and rollback signals.
- Watch Railway logs and Resend logs during the first real-user wave.
- Run `pnpm --filter @sellr/api media:health` after early listing activity.
- Keep `sellr-web.vercel.app` and the Railway backing API URL available for
  diagnostics until the custom domain stack has had enough production traffic.
- Collect real launch proof, testimonials, approved member/seller photos,
  campus imagery, and seed-listing imagery before adding them to the public
  landing page.
