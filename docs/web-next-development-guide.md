# Sellr Web Next Development Guide

Last updated: May 11, 2026.

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

Work items:

- Remake the landing page around the community marketplace value proposition.
- Add favicon and verify app metadata/icons.
- Integrate logo and brand assets more consistently across the web app.
- Make Badger Market feel decorated and campus-aware.
- Apply the simple, opinionated UI direction across key surfaces.
- Fix mobile landing hero cutoff.
- Fix the dashboard mobile issue where the welcome-back element stretches text
  vertically.
- Review loading, empty, and error states for brand consistency.

Acceptance notes:

- The landing page should explain what Sellr is, why community trust matters,
  and how a user starts browsing or selling.
- App surfaces should feel connected to the same product, not a set of unrelated
  screens.
- UW/Badger Market cues should support the launch community without hardcoding
  every future community assumption.

### Phase 2: Profile And Auth Hardening

Goal: make identity reliable enough to support trust, posting, and contact
requirements.

Work items:

- Ensure login persists across refreshes and normal device/browser sessions.
- Add or refine the profile page.
- Add profile photo upload and basic profile customization.
- Add profile completion state and trust/profile progress UI.
- Hard-require full name or real display name before posting/contacting.
- Keep verified email or verified phone as an essential trust requirement.
- Change phone number input UX to assume US numbers by default.
- Normalize US phone input to E.164 `+1` format before API calls.
- Show seller identity info on user listings where it improves trust.

Acceptance notes:

- Users should not be surprised by being signed out after a refresh.
- Phone entry should feel local and simple, while stored data remains normalized.
- Profile completion should guide users instead of blocking them everywhere.

### Phase 3: Community Product Surface

Goal: make communities feel like first-class places, not just access gates.

Work items:

- Add global but quiet community switcher in the authenticated app shell.
- Add community homepage.
- Add option to leave a community.
- Add lightweight community theme/config data.
- Create a decorated Badger Market community experience.
- Expand admin community management controls.
- Let admins edit community name, description, rules, branding/theme config, and
  invite code settings.
- Improve member management in the admin dashboard.

Acceptance notes:

- A single-community user should understand where they are without extra noise.
- A multi-community user should be able to switch context predictably.
- Community pages should make the group feel real and local.

### Phase 4: Listing And Browse Upgrade

Goal: improve the core buyer/seller loop without adding broad marketplace scope.

Work items:

- Streamline the listing creation experience.
- Simplify listing form UI and reduce unnecessary friction.
- Keep listing quality high through helper text, preview, validation, and photo
  guidance.
- Support iPhone HEIF/HEIC image uploads or convert them before upload.
- Add seller info to listings where appropriate.
- Use approximate radius in miles instead of kilometers.
- Simplify listing date/time display.
- Add more browse filters and sorting:
  - Category.
  - Condition.
  - Price range.
  - Distance or pickup radius.
  - Recently listed.
  - Has photos.
  - Seller/community trust cues where supported by data.
- Improve marketplace card and listing detail scanability.

Acceptance notes:

- Creating a good listing should feel guided and fast.
- Browse improvements should help users make decisions, not overload the UI.
- Location remains privacy-preserving: approximate area and radius, not exact
  pickup address.

### Phase 5: Trust, Moderation, And Messaging

Goal: improve safety and control around the existing interaction loop.

Work items:

- Add archive/hide conversation behavior for the current user.
- Add admin ability to disable or suspend a member from report review.
- Connect report moderation actions to member management where appropriate.
- Update admin community management with clearer status, role, and moderation
  controls.
- Refine trust/profile progress language across profile, listings, and seller
  cards.

Acceptance notes:

- User-facing conversation actions should not destroy shared history.
- Admin actions should be explicit, auditable, and scoped to authorized admins.
- Trust language should be honest and backed by actual product behavior.

### Phase 6: AI Listing Assistant

Goal: use AI to improve listing quality first, not to add vague AI features.

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

- Upgrade and revamp UI/UX.
- Remake landing page.
- Integrate logo and branding more into the app.
- Make logo and branding more prevalent.
- Add favicon.
- Make design community-first and campus-aware.
- Keep UI simple, opinionated, and recognizable.
- Fix mobile landing page hero cutoff.
- Fix mobile dashboard welcome-back layout issue.

### Community

- Add global but quiet community switcher.
- Add community homepage.
- Add option to leave community.
- Create decorated Badger Market / UW-Madison community.
- Add lightweight community theme/config data.
- Add more community controls to admin dashboard.
- Update admin community management.

### Profile And Trust

- Add profile page.
- Add profile completion requirements.
- Require full name or real display name before key actions.
- Add profile pictures.
- Add more profile customization.
- Add trust/profile progress.
- Show seller info on user listings.

### Auth And Identity

- Improve login persistence across refresh and device sessions.
- Change phone input to US-default phone number entry.
- Normalize phone numbers to `+1` E.164 internally.
- Keep email-first auth as primary web path.
- Keep phone auth as fallback and identity completion path.

### Listings And Browse

- Streamline listing experience.
- Simplify listing form UI.
- Fix mobile image upload for iPhone HEIF/HEIC files.
- Add more browse filters and functionality.
- Use approximate radius in miles.
- Simplify listing date/time display.

### Messaging

- Add archive/hide conversation for current user.

### Admin And Safety

- Allow admin to disable or suspend member from reports.
- Improve admin report-to-member moderation flow.
- Expand admin community controls.

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

- `docs/current-state-and-scope.md`
- `docs/design-language.md`
- `docs/slc-readiness.md`
- `docs/next-session-context.md`
- `apps/web/README.md`

## Implementation Log

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
