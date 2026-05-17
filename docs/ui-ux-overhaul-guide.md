# Sellr UI/UX Overhaul Guide

Last updated: May 17, 2026.

Use this guide before Phase 6 AI work. Sellr already has a functional web SLC;
the next job is to make the existing buyer/seller loop feel simpler, more
personal, more local, and more trustworthy before adding another layer of
features.

This is a product/design/implementation handoff. It does not implement the UI
overhaul by itself. It should steer the next design-system and frontend pass.

## Executive Summary

Sellr is a safer, simpler local marketplace for verified communities. The first
launch is `Badger Market`, a UW-Madison community for practical student resale:
dorm and apartment essentials, furniture, books, electronics, bikes, winter
gear, and move-in/move-out items.

The current app is broad enough for the SLC: email OTP login, community access,
browse/search/filter, listing detail, durable photo upload, seller inventory,
sold lifecycle, buyer contact, inbox replies, notifications, reports, admin
community setup, and seller readiness are present. The product problem is no
longer missing surface area. The problem is clarity, hierarchy, and feeling.

The UI/UX overhaul should:

- Shorten the path from first visit to first meaningful action.
- Make community verification feel like a trust benefit, not red tape.
- Put listings, sellers, pickup context, and next actions ahead of explanation.
- Reduce generic dashboard composition, nested cards, excessive chips, and
  "AI startup" visual patterns.
- Keep safety, reports, blocking/archiving, verification, and moderation cues
  visible and usable.
- Defer Phase 6 AI until the core flow feels confident without it.

## Source Inputs

Reviewed for this direction:

- Repository docs: `README.md`, `AGENTS.md`, `docs/current-state-and-scope.md`,
  `docs/design-language.md`, `docs/web-next-development-guide.md`,
  `docs/slc-readiness.md`, `docs/deployment.md`,
  `docs/email-first-auth.md`, and `apps/web/README.md`.
- Product implementation: `apps/web`, `apps/api`, `apps/mobile`,
  `packages/shared`, and `packages/api-client`.
- Attached onboarding notes in
  `/Users/brianchei/Downloads/ui-ux-onboarding-notes.md`.
- Attached Womp onboarding screenshots and current Sellr landing screenshot.
- Framer template reference at `https://better-recipient-702514.framer.app/`.
- Inspiration references: `https://www.acquired.fm/`,
  `https://www.complexlaw.co.uk/`, and the provided Pinterest board.
- Phase B reference flow PDF:
  `/Users/brianchei/Downloads/Template flows.pdf`.

Notes:

- The Framer page loaded as a template collection rather than a single product
  spec. Treat it as a reference for section rhythm and product-preview density,
  not for crypto, wallet, or generic SaaS content.
- The `view-source:` Framer reference was not accessible in this audit. Do not
  depend on Framer source code for the implementation plan.
- The Phase B PDF was a visual Figma export with no extractable text. It was
  reviewed by extracting the embedded app-flow frames. Treat the observations
  below as reference heuristics, not source-of-truth product requirements.

## Phase B Reference Flow Notes

The attached PDF includes Mobbin-curated flows from Airbnb, Craft, ElevenLabs,
and Fey. The useful overlap for Sellr is not the branding; it is the way mature
products keep core tasks direct while moving supporting explanation into small,
contextual surfaces.

Reference takeaways for Sellr:

- **Airbnb marketplace/search:** inventory stays first, with compact search,
  filter overlays, map/list context, and trust or price notes shown near the
  moment of decision. For Sellr, this supports lighter browse surfaces,
  action-scoped drawers/modals, and fewer always-visible filter panels or
  dashboard cards.
- **Airbnb account and host setup:** sign-up, security, community commitment,
  and host/listing creation use one focused panel or full-screen step at a
  time, with visible progress and direct manipulation. For Sellr, profile,
  community access, and listing creation should ask only what is needed for the
  next useful action and keep preview/progress close to the task.
- **Airbnb profile, messages, and trips:** identity and reservation context are
  anchored to real objects, people, and conversations instead of abstract
  metrics. For Sellr, seller trust, pickup context, and inbox state should sit
  beside the listing or message they affect.
- **Craft onboarding:** calm centered auth and OTP states can be beautiful, but
  the immersive cloud treatment belongs to public/auth moments, not dense app
  workflows. For Sellr, keep auth calm and branded while making signed-in
  surfaces quieter and more content-led.
- **ElevenLabs product app:** dense tool screens work when selected state,
  navigation, and primary task controls are clear. For Sellr admin and seller
  management, choose utilitarian lists, rows, and dividers over stacked panels.
- **Fey AI onboarding:** the cinematic dark AI onboarding works for an AI-native
  product, but Sellr should not borrow that mood before Phase 6. If AI appears
  later, it should be a quiet optional helper inside seller workflows.

Phase B design-system implication: update existing tokens and utilities in
place so authenticated screens inherit a calmer canvas, lighter panel shadows,
smaller radii, quieter chips, and task-first buttons without introducing a new
design-system library or changing SLC behavior.

## Repository Audit

### Existing Product And Reference Docs

- `README.md`: current status, repository map, platform, capabilities, commands.
- `AGENTS.md`: operating rules, current product direction, deployment context.
- `docs/current-state-and-scope.md`: current SLC surface and launch scope.
- `docs/design-language.md`: brand tokens, component direction, content voice.
- `docs/web-next-development-guide.md`: phase history, Pre-Phase 6 plan, Phase 6
  AI plan.
- `docs/slc-readiness.md` and `docs/slc-smoke-test.md`: readiness gates and
  smoke coverage.
- `docs/deployment.md`, `docs/custom-domain-cutover.md`,
  `docs/email-first-auth.md`, `docs/production-runbook.md`, and
  `docs/next-session-context.md`: production and handoff references.

### App Structure

- `apps/web`: Next.js 16 App Router web SLC using React 19 and Tailwind CSS 4.
- `apps/api`: Fastify API, Prisma 7 generated client, routes for auth,
  communities, listings, messages, offers, meetups, notifications, reports,
  uploads, and search.
- `apps/mobile`: Expo app scaffold. Keep compatible with Expo SDK 55; do not
  prioritize native parity for this overhaul.
- `packages/shared`: domain enums, types, and Zod schemas.
- `packages/api-client`: typed fetch helpers used by web/mobile.

### Web Route Surface

- Public entry: `/`
- Auth: `/login`
- First-run community access: `/onboarding`
- Authenticated shell: `apps/web/app/(app)/layout.tsx`
- Home/dashboard: `/dashboard`
- Marketplace: `/marketplace`
- Listing detail: `/marketplace/[listingId]`
- Listing create/edit: `/sell`, `/listings/[listingId]/edit`
- Seller inventory: `/listings`
- Community pages: `/communities/[communityId]`, `/communities/join`
- Inbox: `/inbox`, `/inbox/[conversationId]`
- Notifications: `/notifications`
- Profile/storefront: `/profile`, `/sellers/[sellerId]`
- Admin: `/admin`, `/admin/community`, `/admin/reports`

### Design Assets And Tokens

- Brand assets live in `apps/web/public/brand`.
- Expo mirrors app icon assets in `apps/mobile/assets`.
- Tailwind CSS 4 is configured through `@import "tailwindcss"` and custom
  tokens/utilities in `apps/web/app/globals.css`.
- No `tailwind.config.*`, `components.json`, `@/components/ui` shadcn setup, or
  lucide dependency was found. Do not introduce shadcn or a new icon system
  during this documentation phase.
- Current brand tokens already preserve the known palette:
  `#ffe347` mustard, `#6457a6` purple, `#23f0c7` mint, warm off-white canvas,
  and charcoal text.
- Current app utilities include `app-shell-bg`, `app-panel`, `app-panel-soft`,
  `app-chip`, `app-action-primary`, and `app-action-secondary`.

### Phase 6 AI Context

Phase 6 is documented in `docs/web-next-development-guide.md` as a future AI
listing assistant: title/description/category/condition suggestions and quality
checks. It must remain deferred until this overhaul is complete. Future AI
touchpoints should be quiet, editable suggestions inside seller workflows, not
the product identity.

## Current UI/UX Diagnosis

The current web app has the right product thesis and many working flows, but it
often explains Sellr instead of letting people use Sellr. It feels more like a
polished internal dashboard/landing template than a local marketplace shaped
around student resale.

Main diagnosis:

- The landing page is thesis-rich but too long before activation.
- Auth and onboarding are functional, but copy can make verification feel like
  an obstacle instead of the first trust win.
- The app shell and dashboard use many panels, KPIs, chips, and readiness
  blocks; the next action can compete with secondary information.
- Browse and listing detail contain useful seller/pickup/trust signals, but the
  UI presents many of them as metadata chips instead of a natural decision
  hierarchy.
- Listing creation has good safeguards, photo upload, and quality guidance, but
  the form can still feel like a configuration surface rather than guided
  selling.
- Empty/loading/error states exist in many places, but the overhaul should
  standardize them as activation moments.

## Product Experience Goals

1. **Activation first.** A new verified student should know what Sellr is, join
   Badger Market, and browse or sell within minutes.
2. **Marketplace density.** The product should feel alive through real listings,
   seller names, item photos, pickup context, and recent activity.
3. **Trust without drama.** Verification, community membership, reporting, and
   approximate pickup guidance should be obvious, calm, and backed.
4. **Shorter decision paths.** Buyer and seller screens should make the next
   useful step visible without multiple explanatory panels.
5. **Campus launch specificity.** Badger Market should feel tailored to
   UW-Madison without hardcoding Sellr into one campus forever.
6. **Accessible polish.** Keyboard, focus, contrast, touch targets, semantic
   state messaging, and responsive behavior are launch requirements.

## Target User Mental Model

### Buyer

> "I want to find a useful item near campus from someone real, understand pickup
> expectations, and message without weird uncertainty."

Buyer priorities:

- Is this item available and worth the price?
- Is the seller in my community?
- Where would pickup generally happen?
- What condition is it in?
- What should I ask or send next?

### Seller

> "I want to post something quickly, look credible, reduce repetitive questions,
> and coordinate with a serious buyer."

Seller priorities:

- What should I include so buyers stop asking basic questions?
- Does my listing look trustworthy?
- Who messaged me and about which item?
- How do I mark this sold or cleanly manage it?

### Community Admin

> "I need to manage access, review reports, and take explicit actions without
> accidentally harming trust."

Admin priorities:

- Which community am I managing?
- Who or what was reported?
- What action is allowed and auditable?
- What changed after I acted?

## Design Personality

Sellr should be:

- Warm, local, and practical.
- Friendly, not childish.
- Clear, not corporate.
- Confident, not hype-driven.
- Designed around actual listings, not abstract product metaphors.
- More curated and trustworthy than Facebook Marketplace, but still familiar.

Reference interpretation:

- From Womp: borrow simple step flow, calm OTP layout, rich visual content after
  entry, and lightweight personalization. Do not copy the playful 3D/creator
  identity.
- From Acquired: borrow editorial confidence, restrained navigation, and a
  recognizable voice. Do not make Sellr media-heavy at the expense of tasks.
- From Complex Law: borrow plain-language trust and serious warmth. Do not make
  Sellr feel like professional services.
- From Framer templates: borrow section rhythm and high-quality product-preview
  framing. Avoid generic SaaS/crypto sections, fake metrics, and shiny effects.

## Visual Design Direction

### Brand Application

Preserve the Sellr palette and logo assets. Tighten usage:

- Mustard is the primary brand signal and highlight color. Use it for selected
  states, verified/community accents, primary launch moments, and small
  confidence cues.
- Charcoal/ink should carry primary text and high-contrast actions.
- Purple should support focus, links, selected navigation, and secondary brand
  moments. Do not let the app become purple-dominant.
- Mint should represent positive trust/safety states: verified contact, active
  community member, pickup-friendly, success.
- Coral/red should be reserved for destructive, report, warning, and error
  states.
- Warm off-white should be the main canvas, but app surfaces should not all be
  large frosted cards.

### Visual System

- Use fewer, stronger containers. Replace nested panels with open sections,
  dividers, list rows, and stable grids.
- Keep cards for repeated listings, modals, and genuinely grouped form/safety
  content.
- Reduce decorative gradients in authenticated app screens. A calm canvas with
  one brand accent beats a template-like background.
- Prefer real listing photos, campus-approved imagery, and actual product UI
  over abstract artwork.
- Use iconography only where it clarifies navigation or state.
- Use clear button hierarchy: one primary action per screen, secondary actions
  near the content they affect, destructive actions visually distinct.

## Onboarding Strategy

The onboarding goal is not to teach Sellr. The goal is to help a verified user
complete the first useful action.

### First-Run Path

1. Public entry gives a one-screen promise: verified local resale, campus launch,
   clear `Join your community` CTA.
2. Login requests the `wisc.edu` email first. Phone remains a fallback.
3. Email OTP screen confirms where the code was sent and offers resend/change
   account without alarmist copy.
4. Community join confirms Badger Market access with the verified email.
5. First signed-in screen asks the user to choose:
   `Browse listings`, `Sell an item`, or `Complete profile` if required.

### Verification Flow

- Use positive framing: `Verify your community access`.
- Explain the why in one sentence: `Badger Market is for verified UW-Madison
  members, so listings and messages stay local.`
- Preserve invite-code fallback for seed sellers and trusted non-Wisc users.
- Never imply verification is a background check, safety guarantee, or KYC.

### Optional Profile Setup

Make profile setup contextual:

- Ask for display name/photo only when needed for high-intent actions like
  listing or contacting.
- Use small readiness checklist copy: `Add your display name so sellers know who
  is messaging.`
- Avoid a long profile wizard before users see the marketplace.

### Buyer Path

- After community access, show browse by default or offer `Browse listings`.
- Empty marketplace should invite saved search and selling without shame:
  `No desks near campus yet. Save this search or list one for your community.`
- First contact should use structured quick replies plus editable text.

### Seller Path

- Let sellers begin with photos and item basics.
- Show one next quality suggestion at a time.
- Keep preview visible on desktop, below the form on mobile.
- Confirm publish with what buyers will see: price, pickup area, community, and
  seller identity.

### First Saved Search Path

Saved search is useful when inventory is sparse. If saved search is implemented
in web UI later:

- Offer it from empty/filtered marketplace states, not as onboarding homework.
- Copy: `Save this search and Sellr can help you check back when something
  matches.`
- Do not create a broad growth loop before launch unless explicitly requested.

### First Offer/Meetup Path

The current web SLC is buyer contact and listing-tied inbox, not a formal offer
or meetup scheduler. Direction:

- Treat the first "offer" as a structured message intent in the listing detail.
- Encourage approximate pickup windows before exact addresses.
- Future meetup UI should live inside the conversation, anchored to the item,
  with safety guidance and clear status.

### Contextual Help Strategy

- Use inline guidance, empty states, and one-step checklists.
- Avoid coach marks, long tours, and modal stacks.
- Persist helpful checklists only where they reflect real progress, such as
  seller readiness or listing quality.

### What To Avoid

- Long tutorial onboarding.
- Asking for user preferences that do not personalize the next screen.
- AI-oriented copy before users experience marketplace value.
- Permission prompts or notification asks before there is a clear user benefit.
- Fake testimonials, invented campus proof, or vague safety promises.

## Current Product Audit

| Area | Current state | Main UX problem | Recommended direction | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Landing page `/` | Public entry has shorter activation, community-first copy, and app preview. | Still needs real launch proof and approved imagery. | Keep first viewport action-oriented; add proof only when real assets exist. | P0 | Shipped pass; proof follow-up |
| Sign up/login `/login` | Email OTP primary with phone fallback, Wisc email validation, concise code step, loading/error states. | Keep fallback secondary and avoid auth copy drift. | Maintain email-first path with phone fallback and focused repair copy. | P0 | Shipped pass |
| Community verification `/onboarding` | Email/invite verification is action-first with lighter trust explanation. | Keep community access from feeling like homework. | Continue to make the verification action the main event. | P0 | Shipped pass |
| First-time onboarding | Signed-in home/dashboard now emphasizes browse, sell, reply, or readiness. | Need final route/state QA for blocked or incomplete profiles. | Keep profile requirements contextual and action-linked. | P0 | Shipped pass; Phase F QA |
| Dashboard `/dashboard` | Reframed toward home/next actions with active community, listing/message context, and readiness. | Route is still named `/dashboard`, which is acceptable for SLC but conceptually `Home`. | Do not rebuild again unless launch users struggle to choose a next action. | P0 | Shipped pass |
| Browse/search `/marketplace` | Server-backed filters, search, category/condition/price/radius/photo/sort, quick filters, listing grid. | Final QA should confirm filters stay compact on mobile and empty states remain useful. | Inventory-first browsing with filters as supporting controls. | P0 | Shipped pass; Phase F QA |
| Listing cards | Cards prioritize image, price, title, condition, neighborhood, radius, freshness, and seller trust. | Some photo/category overlays intentionally remain because they support scanability. | Avoid adding low-value metadata back to cards. | P0 | Shipped pass |
| Listing detail | Item-first layout with seller/pickup confidence near contact and clearer report/message hierarchy. | Final QA should cover own listing, sold/unavailable, incomplete profile, and message-success states. | Preserve item-anchored contact and privacy-preserving pickup context. | P0 | Shipped pass; Phase F QA |
| Offer flow | Web SLC remains listing-tied contact/message intent, not formal offers. API modules still exist. | Avoid implying a full offer handoff in UI. | Keep documented as structured inquiry until formal offer UI is intentionally scoped. | P1 | Deferred by scope |
| Meetup coordination | No dedicated scheduler; pickup windows and safety guidance live in listings/messages. | Avoid introducing a half-built meetup state. | Future meetup UI should live inside conversations after launch feedback. | P1 | Deferred by scope |
| Inbox/messages | Conversation list/thread are item-anchored with archive/restore, reply, safety/report affordances. | Final QA should confirm mobile list/detail behavior and empty/archived states. | Keep item, participant, reply, and safety context together. | P0 | Shipped pass; Phase F QA |
| Notifications | Notifications read as activity rows with unread state, target links, mark-read actions, and empty states. | Final QA should cover populated admin/message/listing notifications. | Keep every notification tied to one useful target/action. | P1 | Shipped pass; Phase F QA |
| Profile `/profile` | Page is framed as how the member appears to buyers/sellers, with readiness and editable identity. | Final QA should cover missing display name/photo/contact/community states. | Keep trust cues backed and linked to high-intent actions. | P1 | Shipped pass; Phase F QA |
| Seller storefront `/sellers/[sellerId]` | Storefront answers who, verified contact, community, active listings, and how to contact through an item. | Need non-own-seller report/contact visual smoke with seeded data. | Keep contact item-anchored and storefront language local/trust-specific. | P1 | Shipped pass; Phase F QA |
| Safety/reporting/blocking | Report dialog, admin reports, archive/hide, and moderation actions are preserved and clearer. | Final QA should cover dialog focus, report success/error, and destructive confirmations. | Keep safety entry points near the affected listing, seller, or conversation. | P0 | Shipped pass; Phase F QA |
| Admin/moderation | Admin community/reports are denser, utilitarian, and audit-focused. | Admin is desktop-priority but must remain usable on mobile without broken layout. | Continue avoiding decorative dashboard patterns. | P1 | Shipped pass; Phase F QA |
| Empty states | Foundation `app-empty-state` and route-specific next actions are used across core routes. | Need final audit for any stale generic empty copy. | What happened, why it matters, one next action. | P0 | Mostly shipped; Phase F QA |
| Error states | Errors remain route/form-specific, with app alert styling and repair copy. | Need final audit for field-level `aria-describedby` coverage. | Tie errors to fields and avoid color-only signals. | P0 | Partially shipped; Phase F QA |
| Loading states | Skeletons/structured loading states exist on many routes. | Some generic loading copy may remain and should be fixed only where visible. | Preserve layout dimensions and action context while loading. | P1 | Partially shipped; Phase F QA |

## Screen-By-Screen Direction

### Landing Page

- User goal: understand Sellr and join the right community.
- UX principle: marketplace-first, one obvious next step.
- Layout: compact header, first viewport with Sellr promise, primary CTA, and a
  real/realistic marketplace preview that hints at listings and pickup.
- Key components: hero, preview, concise trust commitments, launch FAQ.
- Primary CTA: `Join your community`.
- Secondary actions: `Sign in`, `See how it works`.
- Trust/safety cues: verified `wisc.edu`, community-scoped listings, no exact
  pickup address before conversation.
- Empty state: if launch inventory is not public, show seed categories and
  honest launch access rather than fake listings.
- Error state: public page should not dead-end; broken CTA routes to login.
- Mobile: first viewport must show headline, CTA, and hint of preview without
  clipping.
- Future AI touchpoint: none in landing headline. AI can appear later as seller
  listing help, not brand identity.

### Login

- User goal: verify contact and continue.
- UX principle: safety by default, no long tutorial.
- Layout: single calm auth panel with campus-context side note or small preview.
- Key components: email input, OTP input, resend/change account, phone fallback.
- Primary CTA: `Send code` / `Verify code`.
- Secondary actions: `Use phone instead`, `Back to email`.
- Trust/safety cues: `Use your wisc.edu email to join Badger Market`.
- Empty/loading/error: disabled submit while sending; OTP error says what to fix.
- Mobile: input and CTA stay above fold; code field supports paste/autofill.
- Future AI touchpoint: none.

### Community Verification

- User goal: join Badger Market or another verified community.
- UX principle: trust is visible.
- Layout: action-first card with active verified email, invite fallback, and one
  sentence of why.
- Key components: student email confirmation, invite code, community summary.
- Primary CTA: `Join Badger Market`.
- Secondary actions: `Use invite code`, `Sign out`.
- Trust/safety cues: member-only browsing/contact; invite codes for trusted
  early users.
- Empty/error: invalid code/domain tells user the exact repair.
- Mobile: tab/segmented control labels must not wrap awkwardly.
- Future AI touchpoint: none.

### Home / Dashboard

- User goal: choose browse, sell, reply, or fix readiness.
- UX principle: one obvious next step.
- Layout: home surface, not analytics dashboard. Lead with active community and
  next best action.
- Key components: community context, primary action rail, recent messages,
  recent listings, small readiness checklist.
- Primary CTA: dynamic: `Browse listings`, `Sell an item`, `Reply in inbox`, or
  `Complete profile`.
- Secondary actions: profile, notifications, community home.
- Trust/safety cues: verified contact/community member badges only if backed.
- Empty/error: show a task-based empty state, not a blank dashboard.
- Mobile: primary action rail becomes stacked buttons; no KPI grid above action.
- Future AI touchpoint: a future seller nudge may say `Improve this listing`
  after Phase 6, never as a homepage chatbot.

### Marketplace Browse/Search

- User goal: find relevant items quickly.
- UX principle: marketplace-first.
- Layout: inventory grid/list first, compact search row, collapsible filters.
- Key components: search, quick categories, sort, filter drawer, listing grid.
- Primary CTA: `Sell an item` if inventory is sparse; otherwise listing cards
  are the primary interaction.
- Secondary actions: clear filters, save search later if implemented.
- Trust/safety cues: active community, verified sellers, approximate pickup.
- Empty/error: filtered empty state suggests clearing filters, saving search, or
  listing an item.
- Mobile: sticky search/filter controls; listing card tap targets at least 44px.
- Future AI touchpoint: later search assistance may suggest query refinements,
  but not before baseline search is excellent.

### Listing Detail

- User goal: decide whether to contact seller.
- UX principle: trust is visible.
- Layout: photo gallery and item facts first; seller/pickup confidence next to
  the contact action.
- Key components: photos, title, price, condition, pickup area, availability,
  seller summary, editable message intent, report action.
- Primary CTA: `Message seller`.
- Secondary actions: view seller, report listing, edit/manage if own listing.
- Trust/safety cues: verified contact, active community member, public meetup
  reminder, no exact address guidance.
- Empty/error: deleted/sold/unavailable listings explain status and offer return
  to marketplace.
- Mobile: sticky bottom contact action after initial item details.
- Future AI touchpoint: later buyer-side AI should be limited to optional
  message drafting; never auto-send.

### Listing Creation / Edit

- User goal: publish a trustworthy listing quickly.
- UX principle: progressive disclosure.
- Layout: guided sections with one current focus; preview visible but secondary.
- Key components: photo upload, title, price, condition, category, description,
  pickup area/radius, availability, quality checklist, buyer preview.
- Primary CTA: `Publish listing`.
- Secondary actions: save draft, preview, cancel.
- Trust/safety cues: public pickup guidance, exact-address warning, photo and
  detail quality prompts.
- Empty/error: field errors tie to labels; upload errors explain format/size.
- Mobile: preview below form; sticky publish only after required fields are in
  view or as summary action.
- Future AI touchpoint: title/description/category suggestions after Phase 6,
  always editable and optional.

### Seller Inventory

- User goal: manage active, draft, sold, and stale listings.
- UX principle: one obvious next step.
- Layout: grouped list by status, not a dashboard.
- Key components: listing row/card, status, messages, publish/unpublish, mark
  sold, edit.
- Primary CTA: `Create listing`.
- Secondary actions: edit, mark sold, delete, view listing.
- Trust/safety cues: buyer-contact count and listing quality flags.
- Empty/error: empty inventory invites first listing with examples.
- Mobile: action menus should not hide destructive actions without confirmation.
- Future AI touchpoint: `Improve listing` after Phase 6 for drafts/stale items.

### Inbox / Messages

- User goal: respond and coordinate around an item.
- UX principle: conversations stay item-anchored.
- Layout: conversation list with item thumbnails; thread with item/seller header
  and reply composer.
- Key components: listing context, participant identity, message list, archive,
  restore, report/block entry, quick replies.
- Primary CTA: `Send reply`.
- Secondary actions: view listing, archive, report.
- Trust/safety cues: public meetup and suspicious-payment guidance in relevant
  moments.
- Empty/error: empty inbox points to browse/sell; archived empty explains
  restore behavior.
- Mobile: list/detail navigation should preserve context and back behavior.
- Future AI touchpoint: optional reply suggestions only after message intent is
  clear; no automated negotiation.

### Notifications

- User goal: see what needs attention.
- UX principle: useful states count as design.
- Layout: grouped activity list by today/recent/older.
- Key components: unread state, listing/message/admin icons, mark read, target
  link.
- Primary CTA: each notification links to the target.
- Secondary actions: mark all read.
- Trust/safety cues: admin/report notifications use explicit language.
- Empty/error: empty state says `You're caught up` and offers browse/sell.
- Mobile: row text wraps cleanly; no tiny icon-only controls.
- Future AI touchpoint: none for launch.

### Profile / Seller Storefront

- User goal: understand or improve public trust.
- UX principle: trust must be backed.
- Layout: `How you appear` preview plus editable fields; storefront item grid.
- Key components: display name, avatar, verified contact, active community,
  active listings, report seller where relevant.
- Primary CTA: `Save profile` or `View listings`.
- Secondary actions: upload photo, view storefront.
- Trust/safety cues: backed badges only; no ratings until real.
- Empty/error: missing display name/photo states explain the high-intent action
  they affect.
- Mobile: avatar upload and form controls need large targets.
- Future AI touchpoint: none.

### Safety / Reporting / Blocking

- User goal: report concerns or reduce unsafe contact.
- UX principle: safety by default.
- Layout: report entry near listing/seller/message context, clear modal, clear
  post-submit state.
- Key components: reason, optional details, target summary, submit, cancel.
- Primary CTA: `Submit report`.
- Secondary actions: cancel, archive/hide conversation, admin review link.
- Trust/safety cues: `If you feel unsafe, stop the pickup and report it.`
- Empty/error: report form errors identify missing reason/details.
- Mobile: dialog fits small screens and focus returns after close.
- Future AI touchpoint: no automated moderation promises in UI before Phase 6.

### Admin / Moderation

- User goal: manage community and reports safely.
- UX principle: operational clarity.
- Layout: dense tables/lists, explicit action panels, audit history.
- Key components: community switcher, member filters, report cards, moderation
  actions, removal/deactivation confirmation.
- Primary CTA: context-specific admin action.
- Secondary actions: view listing/member, close report, clear filters.
- Trust/safety cues: every destructive action states target and consequence.
- Empty/error: no reports/no members states are utilitarian and clear.
- Mobile: admin may be desktop-priority, but must remain usable without broken
  layout.
- Future AI touchpoint: AI summary of reports is out of scope before launch.

## Component System Guidance

### Color Usage

- Primary action: ink background with mustard text or mustard background with
  ink text, depending on surrounding contrast.
- Links/focus: purple.
- Success/trust: mint, paired with text/icons.
- Warning/destructive: coral/red.
- Background: warm off-white/white; reduce large gradient panels in app screens.

### Typography

- Keep Inter.
- Use restrained headings in app screens: generally 20-32px, not hero-scale.
- Listing titles should remain readable at card sizes.
- Metadata must meet contrast requirements.
- Do not use negative letter spacing.

### Spacing, Radius, Shadows

- Use a 4px/8px spacing rhythm.
- Default controls: 8-12px radius.
- Listing cards: 12-16px radius after the overhaul unless photo-heavy card
  shape needs more softness.
- Modals: 20-24px radius.
- Shadows should be subtle and functional; borders and spacing should carry
  most hierarchy.

### Cards And Panels

- Avoid cards inside cards.
- Use panels for forms, modals, empty states, and admin action containers.
- Use open sections or dividers for dashboard/home and detail layouts.
- Repeated marketplace items can be cards because comparison is the task.

### Buttons

- One primary CTA per screen region.
- Secondary buttons are bordered/quiet.
- Destructive buttons use explicit copy and confirmation.
- Icon-only buttons need accessible labels and tooltips where meaning is not
  universal.

### Forms

- Labels stay visible.
- Helper text should explain outcome or input format, not the whole product.
- Errors must be tied to fields with `aria-describedby`.
- Required fields must be clear without relying only on color.
- Loading/disabled states must preserve button size.

### Badges And Verification Indicators

Use backed signals only:

- `Verified contact`
- `Active community member`
- `Joined Badger Market`
- `Local pickup`
- `Photo-backed listing`
- `Open to offers`

Avoid:

- `Trusted seller` unless backed by real reputation logic.
- `Safe pickup guaranteed`.
- `AI verified`.
- `Top seller` without real criteria.

### Trust/Safety Components

Create or standardize:

- Seller trust summary.
- Buyer/seller pickup guidance.
- Suspicious payment warning.
- Report entry and report confirmation.
- Admin action confirmation.
- Profile readiness checklist.

### Marketplace Listing Cards

Card hierarchy:

1. Photo or stable placeholder.
2. Price.
3. Title.
4. Condition.
5. Pickup area/radius.
6. Seller/community trust signal.
7. Freshness/status when useful.

Remove or demote:

- Long descriptions on cards.
- Multiple competing badges.
- Photo count unless it is a strong decision signal.

### Search And Filter UI

- Search stays prominent.
- Filters collapse on mobile and can be condensed on desktop.
- Use quick chips for campus-specific categories: furniture, books, dorm,
  electronics, bikes, winter gear, free.
- Always show active filter summary and clear filters.

### Navigation

- Authenticated nav should prioritize `Browse`, `Sell`, `Inbox`, and profile.
- `Dashboard` can become `Home`.
- Community context should be visible but quiet.
- Admin links remain role-gated and secondary.

### Motion And Microinteractions

- Motion clarifies state: hover, press, menu open, upload progress, save
  success, message sent.
- Respect `prefers-reduced-motion`.
- Avoid decorative ambient motion in core marketplace flows.

### Empty, Loading, And Error Patterns

Every state should answer:

1. What happened?
2. Why does it matter?
3. What can I do next?

Examples:

- Empty marketplace: `No listings match "mini fridge" yet. Clear filters or
  save the search for later.`
- Empty seller inventory: `You have not listed anything yet. Start with a photo
  and a pickup area.`
- Error: `We could not send the code. Check the email and try again.`
- Loading: `Checking your community access...`

## Microcopy System

Tone: clear, friendly, direct, safety-aware, community-oriented, not corporate,
not childish, not AI-hype driven.

### Examples

- Onboarding welcome: `Buy and sell with people in your verified community.`
- Email verification: `Use your wisc.edu email to join Badger Market.`
- OTP sent: `We sent a 6-digit code to maya@wisc.edu.`
- Community join: `Join Badger Market with your verified UW-Madison email.`
- Empty marketplace: `No listings here yet. Be the first to post something your
  community can use.`
- Empty filtered search: `No results for this search. Try a wider pickup radius
  or clear a filter.`
- Empty inbox: `No messages yet. Contact a seller from a listing, or post an
  item and replies will appear here.`
- Empty listings: `You have not listed anything yet. Start with one clear photo.`
- Listing creation intro: `Tell buyers what it is, what shape it is in, and
  where pickup usually works.`
- Listing quality nudge: `Add one clear photo so buyers can judge condition.`
- Offer/message submission: `Send message to seller.`
- Message success: `Message sent. You can keep the pickup details in this
  thread.`
- Meetup confirmation: `Pickup plan saved. Share exact details only when both
  sides are ready.`
- Public meetup guidance: `Meet in a public, familiar place when possible.`
- Suspicious payment warning: `Do not send deposits, gift cards, or payment
  codes before seeing the item.`
- Report intro: `Tell us what happened. Reports help community admins review
  unsafe or misleading listings.`
- Block/archive flow: `Hide this conversation from your inbox. It will come back
  if a new message arrives.`
- Profile trust badge: `Verified contact`
- Community trust badge: `Active Badger Market member`
- Notification copy: `Maya replied about Walnut writing desk.`
- Admin action confirmation: `Remove this listing from Badger Market? The seller
  will no longer be able to publish it.`

### Copy Rules

- Prefer verbs: `Browse`, `Sell`, `Reply`, `Publish`, `Report`.
- Use concrete nouns: listing, seller, pickup area, community.
- Avoid platform language: ecosystem, intelligence, unlock, leverage, journey.
- Avoid overpromising: safer than public boards is fine; guaranteed safety is
  not.
- Keep safety copy calm and specific.

## Accessibility And Quality Bar

Accessibility is part of launch readiness:

- Keyboard navigation must cover nav, filters, dialogs, forms, listing cards,
  message composer, and admin actions.
- Visible focus states must be consistent and high contrast.
- Color contrast must meet WCAG AA for text and meaningful UI states.
- Touch targets should be at least 44px for primary mobile actions.
- Icon-only controls need accessible names.
- Use semantic HTML: headings, lists, forms, labels, buttons, links, and dialogs.
- Dialogs must trap focus, support Escape, and restore focus after close.
- Error messages must be tied to fields with `aria-describedby`.
- Do not communicate status by color alone; pair color with text/icon.
- OTP/auth flows must support paste, autocomplete, clear error recovery, and
  screen reader labels.
- Respect `prefers-reduced-motion`.
- Responsive layouts must avoid overlap, clipped labels, horizontal scroll, and
  layout shift at mobile, tablet, and desktop widths.
- Loading states must preserve layout dimensions where possible.
- Images need useful alt text when informative; decorative imagery should use
  empty alt text.

## Mobile Responsiveness Expectations

- Core flows must work at 360px wide.
- Primary actions should remain reachable without horizontal scroll.
- Listing cards should not crop price/title in a way that hides decision data.
- Filter UI should use drawers, disclosure, or stacked controls on mobile.
- Listing detail should place message CTA near the item context and optionally
  use a sticky bottom action after the user has enough information.
- Forms should use single-column layouts, full-width inputs, and stable helper
  text.
- Admin tables may become stacked rows, but actions and audit context must stay
  readable.

## Analytics And UX Success Metrics

Track after implementation:

- Signup completion rate.
- Verification completion rate.
- First community joined.
- First listing created.
- First search performed.
- First offer/message intent sent.
- First message/structured inquiry sent.
- First meetup scheduled, once formal meetup UI exists.
- Listing publish completion rate.
- Search-to-listing-view rate.
- Listing-view-to-offer/message rate.
- Offer/message-to-meetup rate.
- No-show/cancellation rate, once supported.
- Report/block/archive rate.
- D1/D7 retention.
- Seller repeat-listing rate.
- Buyer saved-search usage, once web saved search exists.
- Time to first meaningful action.

Qualitative validation:

- Run 5-10 usability tests with UW-Madison target users.
- Observe first-run onboarding without coaching.
- Ask users what Sellr feels like compared with Facebook Marketplace.
- Identify where users hesitate, mistrust, or misunderstand.
- Ask sellers to create a listing from a real item photo and watch where they
  slow down.
- Ask buyers to find a dorm/apartment item and send a pickup-safe message.

## Implementation Phases

### Phase A - Direction And Documentation

Deliver:

- Finalize this guide and update reference docs.
- No broad UI code changes.
- Capture assumptions, unresolved references, and phase order.

Acceptance:

- Another Codex session can start Phase B without rediscovering product
  strategy.
- Docs clearly defer Phase 6 AI.

### Phase B - Design System Foundation

Status: complete for the Pre-Phase-6 foundation scope. The May 15-16 passes
added the attached flow-reference notes, lightened global app surface
tokens/utilities, updated shared listing/seller trust card patterns, and applied
the lighter foundation to high-impact reusable marketplace, dashboard, listing
detail, admin, profile/report, inbox/notifications, listing management, and
community-home patterns without adding dependencies or changing SLC behavior.

Deliver:

- Audited `apps/web/app/globals.css` tokens/utilities.
- Reduced gradient/panel dependency in app surfaces.
- Defined updated button, panel, card, badge, form, empty, loading, error, and
  focus patterns.
- Confirmed no new design library is needed.

Acceptance:

- Existing routes still render.
- Reusable utilities support the simpler marketplace direction.
- Accessibility baseline is documented and testable.

Closeout notes:

- Foundation utilities now include `app-panel`, `app-panel-soft`,
  `app-panel-dark`, `app-section`, `app-list-row`, `app-empty-state`,
  `app-alert`, `app-field`, `app-chip`, `app-action-primary`, and
  `app-action-secondary`.
- Repeated heavy patterns such as oversized rounded panels, `bg-white/90`
  form fields, dashed empty states with extra card weight, and nested dashboard
  cards were reduced across the main signed-in surfaces.
- Browser DOM smoke on May 16 covered `/`, `/marketplace`, one listing detail,
  `/dashboard`, `/sell`, `/listings`, `/inbox`, `/notifications`, `/profile`,
  one seller storefront, `/admin/community`, and `/admin/reports` with no
  route-blocking render failures or captured console errors. State smoke also
  covered filtered seller-inventory empty state, empty inbox, empty
  notifications, and disabled `Mark all read`.
- Later route slices used the in-app Browser viewport capability for
  representative 390px mobile smoke. Phase F still needs one full, documented
  mobile QA sweep across the route list because those checks happened slice by
  slice rather than as a single release-readiness pass.

### Phase C - Onboarding And Navigation

Status: shipped on `main`. PRs #70-#73 covered signed-in home next actions,
onboarding entry, app navigation priority, and public landing activation.

Deliver:

- Simplify `/`, `/login`, `/onboarding`, `/communities/join`.
- Rename/reframe dashboard into a home/next-action surface if chosen.
- Update app header/navigation priority around browse, sell, inbox, profile.

Acceptance:

- New user path from public entry to community access is shorter and clearer.
- First signed-in screen presents one obvious next step.
- Email-first auth remains primary with phone fallback.

### Phase D - Marketplace Core Screens

Status: shipped on `main`. PRs #74-#77 and #80 covered marketplace filters,
listing detail contact hierarchy, listing form workflow hierarchy, seller
inventory lifecycle hierarchy, and profile/storefront trust hierarchy.

Deliver:

- Redesign browse/search/filter, listing cards, listing detail, create/edit
  listing, seller inventory, profile, and storefront.
- Preserve listing upload, validation, lifecycle, seller trust, and community
  scoping.

Acceptance:

- Buyers can scan inventory faster.
- Sellers can publish with fewer distractions.
- Listing detail clearly answers item, seller, pickup, and contact questions.

### Phase E - Trust And Coordination Flows

Status: shipped on `main`. PRs #78-#79 plus prior admin/report passes covered
inbox item/thread hierarchy, notification activity rows, report/admin context,
and item-anchored trust/coordination language.

Deliver:

- Align inbox/thread, buyer contact intent, safety warnings, report dialog,
  notifications, and admin report/community surfaces.
- Clarify offer/meetup direction as structured message/coordination states
  until formal UI exists.

Acceptance:

- Safety/reporting/blocking affordances remain visible.
- Conversation stays anchored to item and participant.
- Admin actions remain explicit and auditable.

### Phase F - Polish And Launch Readiness

Status: in progress. This remains the next best work before Phase 6 AI.

Deliver:

- Standardize empty/loading/error/success states.
- Add analytics events for UX metrics if missing.
- Run responsive, accessibility, performance, and SLC readiness QA.
- Use real seed inventory and approved imagery where available.

Acceptance:

- No clipped/overlapping text on mobile/tablet/desktop.
- Focus states and field errors meet launch quality.
- `pnpm --filter @sellr/web lint`, `typecheck`, `build`, and `pnpm slc:ready`
  pass or documented blockers are resolved.

Closeout QA notes:

- May 17 Browser smoke covered the route list at 1280px desktop and 390px
  mobile viewports: `/`, `/login`, `/onboarding`, `/dashboard`,
  `/marketplace`, one listing detail, `/sell`, `/listings`, `/inbox`,
  `/notifications`, `/profile`, one seller storefront, `/admin/community`, and
  `/admin/reports`.
- May 17 follow-up added `pnpm smoke:auth-onboarding` to cover logged-out
  auth state, `/login` and `/onboarding` HTML responses, local email OTP
  verification, email-domain community join, and `/dashboard` reachability. The
  smoke now runs inside `pnpm slc:ready`. Browser smoke also covered the
  logged-out `/login` screen; Browser text entry was blocked by the local
  virtual clipboard before a no-community onboarding screenshot could be
  captured.
- May 17 follow-up added a populated inbox thread smoke that creates or reuses
  a buyer/seller listing conversation, sends messages from both participants,
  verifies listing/peer/latest-message thread context, checks archived inbox
  filtering, and confirms a new reply restores an archived thread to active.
- The smoke did not find horizontal overflow, route-blocking render failures,
  or obvious clipped text on the covered desktop/mobile route snapshots.
- One mobile admin navigation initially returned a local internal-error/login
  state during the automated sweep, but immediate rechecks of
  `/admin/community` and `/admin/reports` at 390px loaded correctly with no
  console errors or horizontal overflow. Treat this as a local smoke anomaly
  unless it reproduces.
- `pnpm slc:ready` passed on May 17 after fixing the authenticated web route
  smoke to support multi-community demo users. The smoke now chooses an active
  seller listing from any seller community and checks buyer/admin membership by
  inclusion rather than assuming the first community returned by `/auth/me` is
  the listing community.
- May 17 follow-up hardened the reusable report dialog interaction path with
  initial focus, focus containment, Escape close, trigger focus restoration,
  submit-success focus, local validation coverage, and a Browser smoke on a
  buyer-visible listing report action.
- May 17 follow-up hardened the non-own listing contact path and readiness
  gates: contact-send now has page-level coverage, send failures clear when the
  buyer edits the message, failed profile checks block seller contact with a
  retry action, incomplete profile states hide the contact submit action, and a
  Browser smoke verified a buyer-visible listing can submit into the `Message
  sent` state.
- May 17 follow-up added `pnpm smoke:reports` to submit a real listing report
  through the API, verify the created report fields, and confirm an admin in the
  reported listing community can review it. The smoke now runs inside
  `pnpm slc:ready`. The report dialog also marks the form busy while submitting,
  locks report details during the pending request, and clears submit failures as
  soon as the reporter edits the report.
- May 17 follow-up added `pnpm smoke:inbox` to exercise populated inbox/thread
  API behavior inside `pnpm slc:ready`, plus component coverage for the thread
  reply form's busy and failed-submit states.
- May 17 follow-up used that populated inbox fixture for desktop rendered QA in
  Arc/Computer Use. The buyer login path reached `/inbox`, opened the seeded
  Walnut study desk thread, and verified the populated conversation row, item
  context, seller trust summary, report/archive actions, message history, pickup
  safety copy, quick replies, and empty-reply disabled state without obvious
  clipping or horizontal overflow.
- May 17 follow-up added `pnpm smoke:notifications` to create real message
  notifications, verify unread filtering, mark an individual notification read,
  and clear remaining unread state through mark-all-read inside
  `pnpm slc:ready`. Browser smoke also verified the populated `/notifications`
  list at desktop and mobile widths, including the mark-all-read interaction.
- Remaining Phase F risks: authenticated mobile populated inbox/thread visual
  QA, authenticated no-community onboarding visual QA if final signoff requires
  a screenshot, and a seeded incomplete-profile visual Browser smoke if a
  launch fixture is added.

## Process Audit Notes

The May 2026 implementation loop produced useful route-level changes, but the
docs were not updated after each merged slice. That made future prompts keep
asking for "the next slice" even after Phase C, D, and E route passes were
already on `main`.

What actually shipped on `main`:

- #70 signed-in home next actions.
- #71 onboarding entry path.
- #72 app navigation action priority.
- #73 public landing activation.
- #74 marketplace filters.
- #75 listing detail contact hierarchy.
- #76 listing form workflow hierarchy.
- #77 seller inventory lifecycle hierarchy.
- #78 inbox item/thread hierarchy.
- #79 notification activity rows.
- #80 profile/storefront trust hierarchy.

Redundancy analysis:

- The redundancy was mostly process-level: repeated "what is next" and
  "implement the next slice" prompts caused similar recommendations to be
  restated after the underlying code had already merged.
- Some areas received multiple intentional passes. For example,
  profile/storefront had an early Phase B trust-context pass and a later Phase D
  trust-hierarchy pass. That is acceptable refinement, but future work should
  name the distinction clearly.
- Listing detail also had multiple contact-hierarchy passes across the broader
  overhaul. Before changing it again, inspect the current route and identify a
  concrete regression or launch-user problem.
- Verification was repeated often because each slice ran focused checks. That
  was useful for safety, but future sessions should avoid rerunning the same
  broad build/browser smoke unless files changed or Phase F closeout is the
  explicit goal.
- The next implementation prompt should be Phase F closeout, not another Phase
  C/D/E route rewrite.

## Acceptance Criteria For The Overhaul

The overhaul is complete when:

- The new-user path from `/` to community access is short, clear, and coherent.
- First signed-in screen makes the next best action obvious.
- Marketplace browse and listing detail feel item-first, local, and person-aware.
- Listing creation feels guided without becoming a long settings form.
- Trust cues are honest, backed, and consistently phrased.
- Safety/reporting/blocking/moderation affordances are preserved.
- Empty, loading, error, validation, and success states are covered for every
  changed flow.
- Desktop and mobile layouts avoid overlap, clipping, horizontal scroll, and
  unstable action sizing.
- Admin surfaces are visually aligned but remain utilitarian.
- Phase 6 AI remains future-only and does not define the UI identity.

## Verification For Future Implementation

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

Browser verification should cover desktop and mobile widths for:

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

Use seeded/demo data where possible. Route smoke tests validate responses, but
they do not replace visual, responsive, and accessibility review.

## Recommended Next Prompt For Phase F Closeout

```text
Begin Phase F closeout of the Sellr Pre-Phase-6 UI/UX overhaul. Read AGENTS.md,
docs/ui-ux-overhaul-guide.md, docs/design-language.md,
docs/current-state-and-scope.md, docs/web-next-development-guide.md,
apps/web/README.md, and apps/web/app/globals.css. Do not restart Phase C, D, or
E route redesigns unless a fresh audit finds a concrete regression. Run a final
route/state/responsive/accessibility QA sweep across `/`, `/login`,
`/onboarding`, `/dashboard`, `/marketplace`, one listing detail, `/sell`,
`/listings`, `/inbox`, one thread, `/notifications`, `/profile`, one seller
storefront, `/admin/community`, and `/admin/reports`. Fix only small,
reviewable regressions, preserve current SLC behavior, do not implement Phase 6
AI, do not add broad product scope, and do not add a new design-system library.
Run `pnpm slc:ready` plus focused web lint/typecheck/test/build checks, or
document blockers.
```
