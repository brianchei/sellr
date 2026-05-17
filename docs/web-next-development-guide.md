# Sellr Web Next Development Guide

Last updated: May 17, 2026.

Use this as the living guide for the next wave of Sellr web work after the
current SLC/MVP. Update it as implementation progresses, decisions change, or
features move from planned to shipped.

## Context

The current web SLC is production-live and launch-ready for the initial campus
release. It already includes email-first OTP login, community onboarding,
marketplace browse/search/filter, listing detail, durable listing photo upload,
seller inventory management, sold lifecycle, seller storefront-lite pages,
buyer contact and inbox replies, notifications, basic reporting, admin reports,
admin community setup, media lifecycle cleanup, and the seller readiness panel.

The next product direction is not broad marketplace expansion. It is focused on
making Sellr feel more polished, community-native, trustworthy, and recognizably
designed for the first campus launch while preserving the ability to support
future communities.

The Phase 1 brand, landing, and app-wide visual polish pass has now shipped in
the web app, and the production visual smoke pass completed successfully. The
remaining Phase 1 work is not new product functionality: it is adding real
launch proof, testimonials, statistics, and approved imagery once those assets
exist.

Before beginning Phase 6 AI listing-assistant work, finish the UI/UX overhaul
closeout documented in [`ui-ux-overhaul-guide.md`](./ui-ux-overhaul-guide.md).
The core route-level passes have shipped, so the next product risk is not
another redesign slice. It is launch-readiness QA: confirming responsive
layouts, accessibility, state coverage, documentation accuracy, and final SLC
readiness after the app has been simplified.

## Product Theme

Sellr should feel like a simple, opinionated, community-first marketplace, not a
generic template app. The UI should stay operational and easy to scan, but it
should embrace a recognizable core design system:

- Local and community-aware.
- Trust-forward without overpromising safety.
- Campus-aware for the Badger Market launch.
- Simple, memorable, and consistent.
- Focused on listing quality, identity, pickup confidence, and seller intent.

Avoid vague SaaS-style visuals, overly decorative marketing layouts inside app
flows, and generic marketplace UI that could belong to any resale app.

## Locked Decisions

### Community Branding

Use a hybrid community branding model.

Add lightweight community theme/config data where it helps the product feel
specific, but do not build a fully generic theming engine yet. Badger Market
should be the first decorated community.

Useful community-level fields may include:

- Display name.
- Short description.
- Theme key or accent color.
- Optional logo or banner image.
- Local pickup guidance.
- Community rules or guidelines.
- Featured neighborhoods or campus areas.

Badger Market can use UW-Madison flavor, copy, and visual cues, but Sellr should
remain a general community marketplace under the hood.

### Community Switching

Make community switching global but quiet.

The authenticated app shell should show the active community. If a user belongs
to one community, this can be simple context. If a user belongs to multiple
communities, the shell should provide a compact selector.

Changing the active community should affect community-scoped surfaces such as:

- Marketplace browse and filters.
- Listing creation.
- Seller inventory context where applicable.
- Dashboard community cards.
- Notifications and inbox filtering if those become community-scoped in the UI.
- Admin/community surfaces for authorized users.

### Profile Completion

Use a soft readiness panel with hard requirements for essential identity fields.

Hard requirements before high-intent actions such as posting a listing or
contacting a seller:

- Full name or real display name.
- Verified email or verified phone.
- Active community membership.

Strongly encouraged through profile progress:

- Profile photo.
- Phone number for email-first users.
- Verified email for phone-first users.
- Pickup area or neighborhood preference.
- Short bio.
- First listing with at least one photo.

### Conversation Deletion

Conversation deletion should mean archive or hide for the current user, not
permanent deletion.

This preserves auditability and avoids deleting the other participant's thread.
The user-facing copy should use language such as `Archive conversation` or
`Hide conversation` rather than implying global deletion.

### Reputation

Frame reputation as trust and profile progress, not points, prestige, or game
currency.

Prefer concrete trust cues:

- Verified community member.
- Verified email.
- Profile complete.
- Active seller.
- Listings with photos.
- Responsive seller only when backed by real response data.

Avoid implying KYC, background checks, transaction guarantees, or mature
reputation scoring before the product supports those claims.

## Implementation Phases

### Phase 1: Brand, Landing, And Mobile Polish

Goal: make the current product feel intentional and launch-ready without
changing core backend contracts.

Status: shipped, with content-proof follow-ups remaining.

Shipped:

- Remake the landing page around the community marketplace value proposition.
- Add favicon and verify app metadata/icons.
- Integrate logo and brand assets more consistently across the web app.
- Make Badger Market feel decorated and campus-aware.
- Apply the simple, opinionated UI direction across key surfaces.
- Fix mobile landing hero cutoff.
- Fix the dashboard mobile issue where the welcome-back element stretches text
  vertically.
- Review loading, empty, and error states for brand consistency.

Remaining Phase 1 follow-ups:

- Add real social proof, usage statistics, testimonials, and student/seller
  photos once they are available from launch usage or approved community
  sources.
- Replace illustrative landing preview/listing imagery with approved real
  product, campus, seed-listing, or member imagery where it improves trust.
- Keep checking loading, empty, and error states for consistency as Phase 2+
  surfaces are added.

Acceptance notes:

- The landing page should explain what Sellr is, why community trust matters,
  and how a user starts browsing or selling.
- App surfaces should feel connected to the same product, not a set of unrelated
  screens.
- UW/Badger Market cues should support the launch community without hardcoding
  every future community assumption.
- Do not publish invented testimonials, inflated metrics, or internal
  implementation proof. Use real community proof only after it is acquired and
  approved for public use.

### Phase 2: Profile And Auth Hardening

Goal: make identity reliable enough to support trust, posting, and contact
requirements.

Status: shipped.

Shipped:

- Web auth hydration now retries `/auth/me` through `/auth/refresh` when the
  short-lived access cookie expires but the httpOnly refresh cookie is still
  valid.
- Phone sign-in now uses US-default input and normalizes valid US numbers to
  E.164 `+1` format before OTP API calls.
- Shared profile completion rules now require a real display name, verified
  email or phone, and active community membership before high-intent actions.
- Posting listings and contacting sellers are blocked on the API and reflected
  in web UI with profile-completion calls to action.
- Same-origin web API calls now retry once through refresh-cookie rotation after
  a `401`, so normal app requests can recover from expired access cookies.
- Added a dedicated `/profile` page using existing app panel, form, action, and
  trust-card patterns, with profile photo file upload backed by profile-avatar
  storage.
- Account navigation and profile-completion CTAs now route users to `/profile`
  where appropriate, while community membership gaps still route to onboarding.
- Seller-owned listings now include the existing seller identity/trust card so
  sellers can preview how buyers see them.
- The dashboard profile section now mirrors the same high-intent readiness rules
  and points users to `/profile`, while profile saves refresh buyer-facing seller
  cards, listing detail, storefront, and inbox caches.
- Dashboard profile readiness, `/profile`, high-intent CTAs, and seller-owned
  identity previews now provide profile-completion guidance across the useful
  Phase 2 surfaces.

Acceptance notes:

- Users should not be surprised by being signed out after a refresh while a
  refresh cookie is still valid.
- Phone entry should feel local and simple, while stored data remains normalized.
- Profile completion should guide users instead of blocking them everywhere.

### Phase 3: Community Product Surface

Goal: make communities feel like first-class places, not just access gates.

Status: started.

Shipped:

- `/auth/me` now returns active community summaries for the signed-in user.
- The authenticated app shell now shows the active community quietly; users with
  multiple active memberships can switch context from the header.
- Added a member-only `/communities/[communityId]` homepage backed by
  `GET /communities/:communityId`, with community details, membership context,
  active member/listing/seller stats, recent listing previews, guidance, and
  browse/sell CTAs scoped to that community.
- Added lightweight Badger Market/campus presentation cues on the community
  homepage, including UW-style copy, trust highlights, local-area chips, and
  fallback pickup guidance without a full generic theming system.
- Added a member community leave flow on `/communities/[communityId]` backed by
  `POST /communities/:communityId/leave`, with last-admin protection, active
  listing guards, and a confirmed option to remove the seller's active/draft
  listings while leaving.
- Added a signed-in `/communities/join` flow so existing members can join
  another community with an invite code or verified email-domain match, refresh
  their membership context, switch to the new community, and land on its
  community homepage.
- Added an explicit `/admin/community` management-community switcher so admins
  with multiple active admin memberships can choose which community's invites
  and members they are managing, with the selected community reflected in the
  URL.
- Added admin-editable community details on `/admin/community` backed by
  `PATCH /communities/:communityId`, covering name, type, access method, email
  domain, and member-facing rules/guidance stored in the existing community
  fields.
- Expanded admin-editable lightweight community presentation config for short
  descriptions, theme keys, accent colors, pickup guidance, local areas, and
  optional approved banner/logo image URLs.
- Improved `/admin/community` member management with search, role/status
  filters, result counts, clearer access action labels, inactive-access reason
  context, and no-results states.
- Connected `/admin/reports` to member management by adding target member
  context and a `Manage member` CTA that opens `/admin/community` with the
  relevant community and member search context.
- Added scoped report-linked moderation actions on `/admin/reports` so admins
  can demote reported admins or deactivate/suspend member access from the report
  card while keeping report status review separate.
- Added audit-friendly moderation history for report-linked member actions.

Work items:

- Add real approved Badger Market / UW-Madison imagery when it exists and has
  permission to be used publicly.
- Revisit richer suspension semantics only if launch operations need more than
  the current inactive/suspended access reason model.

Acceptance notes:

- A single-community user should understand where they are without extra noise.
- A multi-community user should be able to switch context predictably.
- Community pages should make the group feel real and local.

### Phase 4: Listing And Browse Upgrade

Goal: improve the core buyer/seller loop without adding broad marketplace scope.

Status: complete for the current web SLC.

Implemented:

- Listing creation and edit now include an inline listing-strength checklist for
  photos, title clarity, useful details, and pickup readiness.
- The listing image picker accepts iPhone HEIC/HEIF files and converts them to
  JPG before upload when the browser can decode them, with fallback guidance
  when conversion is unavailable.
- Pickup radius labels and listing display formatting now use miles while
  preserving the existing meter-based API contract.
- Marketplace browse now sends search, category, condition, has-photo, and
  recent/price sort controls to the community-scoped listings API.
- Marketplace browse now includes server-backed price range and pickup-radius
  filters, with inline validation for unusable price ranges.
- Listing cards now surface photo count, approximate pickup radius, seller name,
  active listing count, and verified/community-member trust cues for faster
  scanning.
- Listing detail now brings seller/trust context into the primary listing
  content, adds an at-a-glance scan section, and formats pickup windows with
  buyer-friendly AM/PM times.
- Listing creation/edit now has quick-pick price, pickup area, and common pickup
  window helpers, a sticky buyer preview, clearer next-step listing-strength
  guidance, and AM/PM preview timing.

Follow-ups:

- Keep tuning listing creation and detail hierarchy only as real seed inventory
  and buyer feedback reveal specific friction.

Acceptance notes:

- Creating a good listing should feel guided and fast.
- Browse improvements should help users make decisions, not overload the UI.
- Location remains privacy-preserving: approximate area and radius, not exact
  pickup address.

### Phase 5: Trust, Moderation, And Messaging

Goal: improve safety and control around the existing interaction loop.

Work items:

- Add archive/hide conversation behavior for the current user. Completed:
  archived threads are hidden from the active inbox, remain available in an
  archived view, can be restored, and reappear automatically when a new message
  arrives.
- Add admin ability to disable or suspend a member from report review.
  Completed with scoped report-linked member actions.
- Connect report moderation actions to member management where appropriate.
  Completed with member-management links and moderation history.
- Update admin community management with clearer status, role, and moderation
  controls. Completed with role/status filters, access labels, reason context,
  and empty states.
- Refine trust/profile progress language across profile, listings, and seller
  cards. Completed with consistent backed-signal copy for verified contact,
  active community membership, profile photos, active listings, storefronts,
  and inbox profile details.

Acceptance notes:

- User-facing conversation actions should not destroy shared history.
- Admin actions should be explicit, auditable, and scoped to authorized admins.
- Trust language should be honest and backed by actual product behavior.

### Pre-Phase 6: UI/UX Overhaul

Goal: simplify the current web SLC and make the product feel personal,
trustworthy, attractive, and purpose-built for local community resale before
adding AI.

Status: implementation passes through Phase E are shipped on `main`; Phase F
closeout remains before Phase 6 begins.

Source guide:

- [`docs/ui-ux-overhaul-guide.md`](./ui-ux-overhaul-guide.md)

Implementation phases:

- Phase A: direction and documentation. Complete.
- Phase B: design system foundation. Complete for the Pre-Phase-6 scope.
- Phase C: onboarding and navigation. Shipped across the public entry,
  email-first auth, community verification, app navigation, and signed-in home.
- Phase D: marketplace core screens. Shipped across marketplace browse/filter,
  listing cards/detail, listing form/edit, seller inventory, profile, and
  storefront.
- Phase E: trust and coordination flows. Shipped across buyer contact,
  inbox/thread hierarchy, notifications, safety/reporting context, and admin
  density.
- Phase F: polish and launch readiness. Remaining.

Completed route-level work:

- Simplified the landing, login, onboarding, and join-another-community path so
  new users understand Sellr and reach community-scoped inventory faster.
- Reprioritized authenticated shell navigation around browse, sell, inbox, and
  profile.
- Reframed `/dashboard` as a calmer signed-in home with next actions, active
  community context, recent listing/message context, and readiness guidance.
- Made marketplace browse, filters, listing cards, and listing detail more
  item-first, with seller trust and pickup context closer to contact decisions.
- Simplified listing creation/edit and seller inventory while preserving listing
  quality guidance, media upload feedback, validation, and publish safeguards.
- Aligned inbox, thread, notifications, profile, storefront, report, admin, and
  community-home surfaces with the lighter token and interaction patterns.

Remaining Phase F work:

- Complete the remaining manual QA follow-ups from the May 17 route smoke:
  logged-out auth/onboarding visuals, populated notifications, populated inbox
  thread, and a seeded incomplete-profile visual Browser smoke if a launch
  fixture is added.
- Audit accessibility and state coverage for dialogs, filters, forms, empty
  states, loading states, errors, disabled controls, focus, and mobile tap
  targets.
- Rerun `pnpm slc:ready` before final handoff if additional code changes land.
- Keep docs current so future sessions do not restart completed Phase C, D, or
  E slices.

Pre-Phase-6 progress:

- Reviewed the attached visual flow-reference PDF from Airbnb, Craft,
  ElevenLabs, and Fey and captured the applicable heuristics in
  `docs/ui-ux-overhaul-guide.md` and `docs/design-language.md`.
- Lightened the existing Tailwind CSS 4 token utilities in
  `apps/web/app/globals.css` instead of adding a new design-system library.
- Reduced default authenticated app gradient/panel weight, softened card
  shadows, added calmer panel/card radii tokens, introduced future-friendly
  `app-section`, `app-list-row`, `app-empty-state`, `app-alert`, and
  `app-field` utilities, and made listing/seller trust cards less
  frosted/nested.
- Applied the lighter foundation to high-impact repeated marketplace,
  dashboard, listing detail, listing management, inbox/notification,
  profile/report, admin, and community-home patterns while preserving current
  SLC behavior.
- Subsequent route passes shipped as PRs #70 through #80, covering signed-in
  home next actions, onboarding entry, app navigation, public landing
  activation, marketplace filters, listing detail contact hierarchy, listing
  form workflow hierarchy, seller inventory lifecycle, inbox item/thread
  hierarchy, notification activity rows, and profile/storefront trust
  hierarchy.
- Browser smoke has covered representative desktop and 390px mobile views for
  several changed surfaces, but a single final Phase F QA sweep is still needed
  before calling the overhaul complete.
- May 17 Phase F work added a broader Browser route smoke at 1280px and 390px,
  documented remaining manual QA risks in `docs/ui-ux-overhaul-guide.md`, fixed
  the authenticated web smoke for multi-community demo users, and got
  `pnpm slc:ready` passing locally outside the sandbox.
- May 17 follow-up hardened report dialog focus, keyboard containment,
  validation, and success-state focus with component tests and a Browser smoke
  on a buyer-visible listing report action.
- May 17 follow-up hardened non-own listing contact-send and profile-readiness
  gates with page-level tests, retryable profile-check failure UI, API-error
  clearing on message edits, and a Browser smoke through `Message sent`.
- May 17 follow-up added `pnpm smoke:reports` and wired it into
  `pnpm slc:ready`; the smoke submits a real listing report through the API and
  verifies admin review visibility. The report dialog now exposes a busy form
  state, locks details while submitting, and clears failed-submit copy on edit.

Acceptance notes:

- The redesign should not add broad product scope or depend on AI.
- Core auth, community scoping, listing lifecycle, media upload, messaging,
  reporting, and admin behavior should continue to work.
- Onboarding should stay contextual and activation-oriented: no long tutorial,
  no preference quiz unless the answer immediately changes the user's next
  useful screen, and no AI-first positioning.
- Every touched flow needs loading, empty, error, validation, and success states
  appropriate to the interaction.
- Desktop and mobile browser verification should cover the route list in
  `docs/ui-ux-overhaul-guide.md`.

### Phase 6: AI Listing Assistant

Goal: use AI to improve listing quality first, not to add vague AI features.

Status: deferred until the Pre-Phase 6 UI/UX overhaul is complete.

Initial AI scope:

- Suggest better listing titles.
- Improve listing descriptions.
- Recommend category and condition.
- Flag missing details.
- Suggest photo/listing quality improvements.

Later AI scope, only after core listing quality is stable:

- Price suggestions.
- Similar item suggestions.
- Search assistance.
- Buyer message drafting or reply suggestions.

Acceptance notes:

- AI should support seller intent and listing quality.
- The listing form should remain usable without AI.
- AI output should be editable, clearly suggested, and never silently final.

## Consolidated Backlog

### UI/UX And Branding

Planned before Phase 6:

- Complete Phase F closeout for the UI/UX overhaul in
  `docs/ui-ux-overhaul-guide.md`.
- Run final desktop/mobile route QA, accessibility/state review, and
  `pnpm slc:ready`.
- Fix only concrete visual, interaction, or state regressions found during that
  closeout.
- Preserve all current SLC behavior while improving launch readiness.

Completed in Phase 1:

- Upgraded and revamped the web UI/UX around the refreshed Sellr design
  language.
- Remade the landing page around community-first marketplace positioning.
- Integrated logo, favicon, Apple touch icon, metadata, and production brand
  assets across public and authenticated web surfaces.
- Made the design more community-first, campus-aware, simple, opinionated, and
  recognizable.
- Fixed the mobile landing hero cutoff and mobile dashboard greeting layout
  issue.
- Added a warm gradient app shell, modern rounded panels, high-contrast
  black/yellow action styling, and refreshed cards/forms/inbox/listing/admin
  surfaces.

Remaining Phase 1 content follow-ups:

- Collect and add real landing-page proof later:
  - verified launch member count.
  - active listing count.
  - successful contact or reply count.
  - 2-3 real testimonials with approved names and photos.
  - campus/community imagery that can be used publicly.
- Add approved imagery where it improves trust and specificity:
  - hero/app preview should use real Sellr marketplace, listing detail, and inbox
    views.
  - proof/testimonial sections can use real member or seller photos after
    permission.
  - Badger Market sections can use approved campus or neighborhood imagery.
  - listing-quality sections can use real seed listing photos with seller
    approval.

### Community

Completed in Phase 3:

- Add global but quiet community switcher.
- Add member community homepage.
- Add lightweight Badger Market / campus presentation cues.
- Add option to leave community.
- Add post-login join-another-community flow.
- Add admin management-community switcher.
- Add admin-editable community details and rules/guidance.
- Improve member management in the admin dashboard.
- Connect reports to member management.
- Add scoped report-linked demote/deactivate actions.
- Add audit-friendly moderation history.
- Add lightweight community branding/theme controls.
- Add optional approved imagery URL support.

Remaining:

- Add real approved Badger Market / UW-Madison imagery when it exists and has
  permission to be used publicly.
- Consider richer suspension semantics only if launch operations need more than
  the current inactive/suspended access reason model.

### Profile And Trust

Completed in Phase 2:

- Add profile page.
- Add profile completion requirements.
- Require full name or real display name before key actions.
- Add profile pictures.
- Add trust/profile progress.
- Show seller info on user listings.
- Refine backed-signal language across profile, listing cards/detail,
  storefronts, and inbox profile details.

Remaining:

- Add more profile customization.

### Auth And Identity

Completed in Phase 2:

- Improve login persistence across refresh and device sessions.
- Change phone input to US-default phone number entry.
- Normalize phone numbers to `+1` E.164 internally.

Remaining:

- Keep email-first auth as primary web path.
- Keep phone auth as fallback and identity completion path.

### Listings And Browse

Completed in Phase 4:

- Streamlined listing creation/edit with listing-strength guidance, quick-pick
  helpers, buyer preview, validation, and photo guidance.
- Fixed mobile image upload for iPhone HEIF/HEIC files where browsers can decode
  and convert them.
- Added server-backed browse search, category, condition, photo-only, price
  range, pickup-radius, and sort controls.
- Added scan-friendly listing cards with seller trust cues, photo count, active
  listing count, and approximate pickup radius.
- Used approximate radius in miles and simplified listing date/time display
  across listing cards, detail, and preview surfaces.

Remaining:

- Tune listing form/detail hierarchy only when seed inventory or buyer feedback
  shows a specific issue.

### Messaging

- Current-user conversation archive/hide is implemented with reversible inbox
  filters and per-user persistence. New messages restore archived threads to
  the active inbox.

### Admin And Safety

- Consider richer suspension semantics only if launch operations need more than
  the current inactive/suspended access reason model.
- Expand admin community controls only when they directly support launch ops.

### AI

- Add AI integration focused first on listing quality.

## Notes For Future Updates

When a feature is implemented, update this guide with:

- The shipped behavior.
- Any scope changes or deferred pieces.
- New routes, API endpoints, migrations, or env vars.
- Verification commands or smoke paths.
- Remaining risks or follow-up tasks.

Keep this guide aligned with:

- `docs/ui-ux-overhaul-guide.md`
- `docs/current-state-and-scope.md`
- `docs/design-language.md`
- `docs/slc-readiness.md`
- `docs/next-session-context.md`
- `apps/web/README.md`

## Implementation Log

### May 15, 2026

- Added the Pre-Phase 6 UI/UX overhaul as the next product-development priority
  before AI listing-assistant work.
- Expanded `docs/ui-ux-overhaul-guide.md` with the repository/route audit,
  current UX diagnosis, onboarding redesign plan, screen-by-screen direction,
  component guidance, microcopy, accessibility requirements, metrics, Phase A-F
  implementation sequencing, acceptance criteria, and verification guidance.
- Started Phase B of the Pre-Phase-6 UI/UX overhaul with flow-reference notes
  from the attached PDF and a small token/component foundation pass across
  `apps/web/app/globals.css`, `components/listing-card.tsx`, and
  `components/seller-profile-card.tsx`.

### May 12, 2026

- Started Phase 1 brand, landing, and mobile polish.
- Wired production logo/favicon/apple-touch assets into web metadata and primary
  UI surfaces.
- Updated the public landing hero to emphasize Sellr as a campus/community
  marketplace with Badger Market as the first launch community.
- Made primary headers use compact symbol assets on small screens and full logo
  lockups on larger screens.
- Revamped the landing page around the approved structure: hook, community
  proof, problem/pain, static product flow, outcome-led benefits, trust
  commitments, FAQ, and final CTA. Pricing remains omitted for launch.
- Reduced mobile hero preview height and adjusted dashboard greeting layout to
  avoid cramped or vertically stretched text on small screens.
- Reworked the landing page visual system using the accessible Figma template
  references: centered hero, early product demo, dark contrast bands, yellow
  brand emphasis, compact proof cards, outcome cards, access cards, FAQ, and
  final CTA.
- Kept testimonials and pricing honest for launch by using trust commitments
  and simple launch access instead of fake quotes or paid tiers.
- Refined the landing hero headline to `Buy and sell locally in your community`.
- Replaced generic product mockups with an interactive Sellr app preview showing
  marketplace, listing detail, inbox, seller context, contact CTA, and pickup
  radius controls.
- Removed internal/developer-facing landing copy and kept future proof,
  testimonials, statistics, and image needs in this guide instead.
- Applied the refreshed design language across the authenticated app shell,
  login/onboarding, dashboard, marketplace, listing detail, listing form,
  seller inventory, inbox, notifications, seller storefront, reports, community
  admin, shared cards, dialogs, and form surfaces.
- Added reusable app-surface utilities for the warm gradient shell, rounded
  elevated panels, soft panels, chips, and high-contrast primary/secondary app
  actions.
- Verification reported for this Phase 1 pass: `pnpm --filter @sellr/web lint`,
  `pnpm --filter @sellr/web typecheck`, `pnpm --filter @sellr/web build`, and
  desktop/mobile browser checks for landing and key app entry points.
- Production visual smoke for the Phase 1 refresh passed across the public
  landing, auth/onboarding, dashboard, marketplace/listing, seller workflow,
  messaging, notifications, and admin surfaces.

### Phase 2 Start

- Added shared profile completion helpers for high-intent actions.
- Updated web auth hydration to rotate the httpOnly refresh cookie and retry
  session loading when the access cookie expires.
- Updated phone fallback login to accept local US phone input and normalize to
  E.164 `+1` before OTP send/verify calls.
- Enforced profile completion before listing creation/publish and seller contact
  in the API, with matching web UI blocks that route users to `/profile` or
  onboarding.
- Added focused shared and API tests for profile completion behavior.
- Added same-origin refresh retry support in the API client so most
  authenticated calls recover once from an expired access cookie.
- Added `/profile` as a dedicated profile management surface using existing app
  panel/form styles, including profile photo file upload, verified contact
  display, public storefront access, and readiness guidance.
- Added an account-menu profile link and seller identity preview card to owned
  listings using existing app components.
- Added dashboard profile-readiness guidance and widened profile-save cache
  invalidation so avatar/display-name changes propagate to seller cards,
  storefronts, listing detail, and inbox surfaces.

### Phase 3 Start

- Added active community summaries to the signed-in auth context and a quiet
  app-shell community indicator/switcher.
- Added a member-only community homepage at `/communities/[communityId]` with a
  community detail API, membership context, active marketplace stats, recent
  listing previews, community guidance, and scoped browse/sell actions.
- Added a lightweight community presentation helper so Badger Market and
  `wisc.edu` campus communities get UW-style homepage copy, local pickup cues,
  trust highlights, and campus-specific guidance without new schema fields.
- Added a community leave flow with active-listing protection, optional
  confirmed listing removal, session refresh, and fallback routing to another
  community or onboarding.
- Added `/communities/join` for existing members to join another community,
  refresh their auth/community context, switch to the newly joined community,
  and continue to its community homepage.
- Added a management-community switcher to `/admin/community` so admins with
  multiple active admin memberships can choose which community's invites and
  members they manage, with the selected community reflected in the URL.
- Added admin-editable community details to `/admin/community` with a typed API
  client helper and admin-only API route for updating name, type, access method,
  email domain, and homepage rules/guidance.
- Added member search, role/status filters, result counts, clearer access action
  labels, and empty states to `/admin/community`.
- Added target member context and `Manage member` links to `/admin/reports` so
  admins can move from a report to the relevant `/admin/community` member view.
- Added report-linked member actions to `/admin/reports` so admins can demote a
  reported admin or deactivate member access from a report card, with explicit
  confirmation copy and separate report status review.
- Added moderation action persistence for report-linked member actions and
  surfaced recent moderation history on report cards.
- Added community presentation config fields and homepage rendering for
  descriptions, theme keys, accent color, pickup guidance, local areas, and
  optional approved banner/logo image URLs.

### Phase 4 Complete

- Added listing-strength guidance, durable multi-photo upload, browser-assisted
  HEIC/HEIF conversion, buyer preview, quick-pick price and pickup helpers, and
  friendlier pickup time formatting to listing creation/edit.
- Added server-backed marketplace filters for search, category, condition,
  photo-only, price range, pickup radius, and price/recent sort.
- Upgraded listing cards and listing detail with faster scanability, seller
  trust cues, active listing counts, photo count, approximate pickup radius,
  at-a-glance detail metadata, and buyer-friendly pickup timing.
- Kept location privacy aligned with the SLC: browse/detail surfaces expose
  approximate area and seller pickup radius, not exact pickup addresses.
