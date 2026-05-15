# Sellr UI/UX Overhaul Guide

Last updated: May 15, 2026.

Use this guide before Phase 6 AI work. The next product slice should overhaul
the web UI/UX so Sellr feels simpler, more personal, more attractive, and less
like a generic AI-generated marketplace template.

This is a planning and implementation handoff. It does not replace
`docs/design-language.md`; it sharpens the next redesign pass and names the
flows, files, and acceptance criteria needed for a separate implementation
session.

## Why This Comes Before Phase 6

The current SLC is functionally broad enough for the launch buyer/seller loop:
email-first sign-in, community onboarding, marketplace browsing, listing
creation, contact, inbox, reporting, admin setup, and trust cues are all
present. Before adding AI listing assistance, the product needs a focused
experience pass so the existing surface feels easier and more human.

Phase 6 AI should remain deferred until the core web experience is cleaner.
Otherwise AI will add another layer of complexity on top of flows that already
feel too busy.

## Problem Statement

Current feedback:

- The interface feels too generic and "AI/vibe-coded."
- The onboarding and first-run flow has too many competing explanations and
  surfaces.
- The app often reads as a dashboard template rather than a local marketplace
  made for real people in a real community.
- Important trust, listing, and pickup context exists, but it is spread across
  too many panels, chips, and secondary UI elements.
- The product needs stronger personality without becoming decorative,
  overbranded, or less usable.

The redesign goal is not to add features. It is to make the existing SLC feel
clear, personal, direct, trustworthy, and enjoyable to use.

## Product Direction

Sellr should feel like:

- A local community marketplace, not a generic SaaS dashboard.
- Personal and neighborly, without becoming cute, noisy, or casual to the point
  of losing trust.
- Faster to understand on first visit, especially for users who only want to
  browse, sell, or reply to a buyer.
- Warm and human, while still using honest trust signals backed by real product
  behavior.
- Built around the object for sale, the seller, the community, and pickup
  confidence.

Avoid:

- Decorative AI-style gradients, shimmer, bokeh, blobs, or vague futuristic
  visuals.
- Nested cards, card-heavy dashboards, and excessive pills/chips.
- Long instructional copy inside task flows.
- Empty marketing sections that do not help users complete a task.
- Fake proof, invented testimonials, unsupported safety claims, or mock-only
  controls.
- Broad feature expansion disguised as redesign.

## Scope

The overhaul should update the web app experience across the current SLC
surface. It should preserve API contracts unless a small contract adjustment is
clearly needed for the redesigned flow.

In scope:

- Public landing and first-run entry.
- Email-first login with phone fallback.
- Community onboarding and join-another-community flow.
- Authenticated app shell and navigation.
- Dashboard or home experience.
- Marketplace browse and filters.
- Listing detail.
- Listing creation and edit.
- Seller inventory.
- Inbox and conversation thread.
- Profile and seller storefront-lite.
- Notifications.
- Shared listing, seller, report, empty, loading, and error states.
- Admin/community/report pages only enough to align shell, typography, spacing,
  and tokens. Keep admin utilitarian.

Out of scope:

- Phase 6 AI listing assistant.
- Payments, escrow, offers, ratings, advanced KYC, logistics, delivery,
  advanced moderation, and growth loops.
- Full community theming engine.
- Native mobile parity.
- New analytics, external services, or production dependencies unless strongly
  justified.

## Design Principles

1. **One obvious next step.** Every screen should make the next useful action
   obvious: browse, sell, complete profile, join community, contact seller, or
   reply.
2. **Reduce the number of containers.** Prefer fewer panels with stronger
   hierarchy over many stacked cards. Do not put cards inside cards.
3. **Show the marketplace sooner.** After sign-in and community access, users
   should quickly see real inventory or an empty state that tells them how to
   start.
4. **Personal beats generic.** Use real names, community context, seller
   identity, pickup area, and listing photos as the emotional center.
5. **Trust must be backed.** Use only signals the product actually supports:
   verified contact, active community membership, profile photo presence,
   active listings, and approximate pickup context.
6. **Short copy, concrete words.** Replace platform language with plain user
   language. Avoid long onboarding explanations.
7. **Mobile first, desktop polished.** Core actions must be reachable, readable,
   and stable on small screens without horizontal scroll or clipped labels.
8. **Useful states count as design.** Loading, empty, error, validation, and
   success states should feel intentional and actionable.

## Visual Direction

Keep the Sellr mustard brand signal and current brand assets, but simplify the
visual system.

Recommended direction:

- Warm off-white canvas, ink text, mustard accents, and restrained secondary
  colors.
- Stronger typography hierarchy with less hero-scale type inside app screens.
- Clear section rhythm and dividers instead of decorative panels everywhere.
- More real product imagery and listing photos when available.
- Fewer badges and chips; keep only metadata that helps the decision.
- Compact icon buttons for repeated tools and familiar actions.
- Rounded corners around `8px` to `12px` for controls and repeated cards;
  reserve larger radii for modal-like or feature surfaces only when needed.
- Soft elevation only for layering. Borders and spacing should do most of the
  structural work.

Avoid:

- Purple-heavy or one-note gradient pages.
- Marketing-style hero composition inside authenticated app flows.
- Decorative background orbs, abstract SVG art, and AI-themed flourishes.
- Oversized dashboard metrics that do not help the buyer/seller loop.
- Text that explains visual styling, keyboard shortcuts, or implementation.

## Content Direction

The copy should sound like Sellr is helping someone buy or sell locally, not
explaining a platform.

Prefer:

- `What are you selling?`
- `Add a clear photo`
- `Choose where pickup usually works`
- `Message seller`
- `Ready to publish`
- `You are browsing Badger Market`
- `Only members can see and contact sellers here`

Avoid:

- `Unlock marketplace intelligence`
- `AI-powered trust layer`
- `Seamless community commerce platform`
- `Leverage your verified marketplace identity`
- `Optimize your selling journey`

## Core User Flows

### New User

Target flow:

1. Land on a simple page that explains the marketplace in one screen.
2. Sign in with email OTP, with phone fallback available but secondary.
3. Join or confirm community access.
4. Land in the marketplace or a home surface that points directly to browse and
   sell.

Requirements:

- Keep the login/onboarding sequence visually calm and step-based.
- Do not require users to understand every Sellr feature before entering.
- Make community access feel like a trust benefit, not a bureaucratic wall.
- Route missing profile/contact/community requirements to the shortest repair
  path.

### Returning Buyer

Target flow:

1. Open app.
2. Browse or search community inventory.
3. Open listing detail.
4. Understand seller, pickup area, condition, and availability.
5. Message seller.
6. Continue in inbox.

Requirements:

- Listing cards should make price, title, image, condition, pickup area, and
  seller trust cue scannable.
- Listing detail should center the item and seller context, not a dashboard of
  metadata.
- Contact should feel like a clear next action, not a form hidden under panels.

### Seller

Target flow:

1. Start from `Sell` or a clear seller CTA.
2. Add photos and core details.
3. See listing quality guidance without being overwhelmed.
4. Preview what buyers will see.
5. Publish and manage listing status.

Requirements:

- Listing creation should feel guided but compact.
- Use progressive disclosure for secondary details where possible.
- Keep the buyer preview helpful, especially on desktop, without stealing
  attention from the current form step.
- Preserve validation, upload feedback, HEIC guidance, and publish safeguards.

### Member With Messages

Target flow:

1. See unread message cue.
2. Open inbox.
3. Recognize listing context and participant.
4. Reply or archive/hide.

Requirements:

- Conversations should stay anchored to the listing and participant.
- Archived state should be clear and reversible.
- Long messages must wrap cleanly on mobile.

### Admin

Target flow:

1. Open admin report or community page.
2. Find the target member/listing.
3. Take scoped, auditable action.

Requirements:

- Keep admin pages dense, clear, and utilitarian.
- Align typography, spacing, buttons, and shell treatment with the redesign.
- Do not make admin pages more editorial or decorative.

## Route And File Map

Start with these files when implementing the redesign:

| Surface | Files |
| --- | --- |
| App shell and global style | `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/(app)/layout.tsx`, `apps/web/components/app-header.tsx`, `apps/web/components/app-footer.tsx` |
| Public entry | `apps/web/app/page.tsx`, `apps/web/components/landing-app-preview.tsx` |
| Auth and onboarding | `apps/web/app/login/page.tsx`, `apps/web/app/onboarding/page.tsx`, `apps/web/app/(app)/communities/join/page.tsx`, `apps/web/components/auth-provider.tsx` |
| Home and readiness | `apps/web/app/(app)/dashboard/page.tsx` |
| Marketplace | `apps/web/app/(app)/marketplace/page.tsx`, `apps/web/components/listing-card.tsx` |
| Listing detail and media | `apps/web/app/(app)/marketplace/[listingId]/page.tsx`, `apps/web/components/photo-gallery.tsx`, `apps/web/components/seller-profile-card.tsx` |
| Listing create/edit | `apps/web/app/(app)/sell/page.tsx`, `apps/web/app/(app)/listings/[listingId]/edit/page.tsx`, `apps/web/components/listing-form.tsx`, `apps/web/components/listing-buyer-preview.tsx` |
| Seller inventory | `apps/web/app/(app)/listings/page.tsx` |
| Messaging | `apps/web/app/(app)/inbox/page.tsx`, `apps/web/app/(app)/inbox/[conversationId]/page.tsx`, `apps/web/components/conversation-list.tsx`, `apps/web/components/conversation-thread.tsx` |
| Profile and storefront | `apps/web/app/(app)/profile/page.tsx`, `apps/web/app/(app)/sellers/[sellerId]/page.tsx` |
| Notifications | `apps/web/app/(app)/notifications/page.tsx` |
| Admin alignment | `apps/web/app/(app)/admin/community/page.tsx`, `apps/web/app/(app)/admin/reports/page.tsx` |
| Shared safety UI | `apps/web/components/report-dialog.tsx` |

## Recommended Implementation Slices

### Slice 1: Experience Audit And Design Tokens

Deliver:

- Capture current desktop and mobile screenshots for the core routes.
- Identify repeated generic patterns: nested cards, excess chips, vague copy,
  oversized headings, confusing next actions.
- Update global tokens and reusable surface/button utilities in
  `apps/web/app/globals.css`.
- Define or adjust shared component patterns before rewriting routes.

Acceptance:

- New tokens support a simpler, warmer, less gradient-heavy app.
- Existing functionality still renders after token changes.
- No new product dependencies unless justified.

### Slice 2: Entry, Login, And Onboarding

Deliver:

- Simplify `/`, `/login`, `/onboarding`, and `/communities/join`.
- Make the first-run sequence feel like one coherent path.
- Reduce copy, tighten hierarchy, and make email-first auth primary.
- Keep phone fallback visible but secondary.

Acceptance:

- A new user understands what Sellr is, why community access matters, and what
  to do next within the first viewport.
- The path from landing to community access has clear loading, error, and
  success states.
- The flow works on mobile without clipped labels or awkward panel stacking.

### Slice 3: App Shell And Home

Deliver:

- Redesign authenticated navigation and active community context.
- Rework `/dashboard` into a useful home or next-action surface rather than a
  generic dashboard.
- Preserve readiness/profile requirements, but simplify presentation.

Acceptance:

- Users can quickly choose browse, sell, profile completion, or messages.
- Active community is visible without dominating the header.
- Admin links remain available only for authorized users.

### Slice 4: Buyer Browse And Listing Detail

Deliver:

- Simplify `/marketplace`, listing cards, filters, and listing detail.
- Reduce metadata noise while preserving useful buyer signals.
- Make seller trust and pickup context feel integrated into the item page.

Acceptance:

- Buyers can scan inventory faster.
- Mobile filter controls are usable and do not crowd the listing grid.
- Contact seller remains clear and gated by existing readiness rules.

### Slice 5: Seller Listing Flow And Inventory

Deliver:

- Simplify `/sell`, edit, buyer preview, and seller inventory.
- Keep listing quality guidance, upload validation, and publish safeguards.
- Make preview and readiness guidance feel helpful rather than heavy.

Acceptance:

- Sellers can create a good listing with fewer visual distractions.
- Validation and upload progress remain clear.
- Inventory status actions are easy to understand and do not cause layout shift.

### Slice 6: Messaging, Profile, Storefront, Notifications, Admin Alignment

Deliver:

- Align inbox/thread, profile, storefront, notifications, and admin surfaces
  with the new shell and tokens.
- Keep admin dense and operational.
- Remove remaining generic copy and inconsistent panel styling.

Acceptance:

- Messaging feels anchored to people and listings.
- Profile/storefront trust language remains backed by real signals.
- Admin flows remain explicit and auditable.

## Acceptance Checklist

The overhaul is complete when:

- The new-user path from `/` to community access is shorter, clearer, and more
  visually coherent.
- The signed-in first screen makes the next best action obvious.
- Marketplace browse and listing detail feel item-first and person-aware.
- Listing creation feels guided without looking like a long settings form.
- Trust cues are honest, backed, and consistently phrased.
- Empty, loading, error, validation, and success states are covered for every
  changed flow.
- Desktop and mobile layouts avoid overlap, clipping, horizontal scroll, and
  unstable action sizing.
- Admin surfaces are visually aligned but remain utilitarian.
- Existing auth, community scoping, listing lifecycle, messaging, reporting,
  and media upload behavior still works.

## Verification

Run focused checks while iterating:

```bash
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
```

For broad handoff after a large redesign:

```bash
pnpm slc:ready
```

Also perform browser verification at desktop and mobile widths for:

- `/`
- `/login`
- `/onboarding`
- `/dashboard`
- `/marketplace`
- `/marketplace/[listingId]`
- `/sell`
- `/listings`
- `/inbox`
- `/profile`
- `/sellers/[sellerId]`
- `/notifications`
- `/admin/community`
- `/admin/reports`

Use real seeded/demo data where possible. Browser route smoke tests validate
authenticated HTML responses, but they do not replace visual review.

## Reference Documents For The Next Session

Read these before implementing:

- `AGENTS.md`
- `docs/ui-ux-overhaul-guide.md`
- `docs/design-language.md`
- `docs/web-next-development-guide.md`
- `docs/current-state-and-scope.md`
- `docs/slc-readiness.md`
- `apps/web/README.md`

Then inspect the route/component files listed in this guide and begin with
Slice 1 unless the user explicitly asks for a different slice.
