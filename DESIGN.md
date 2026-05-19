---
version: alpha
name: Sellr
description: Trust-native local marketplace for verified communities.
colors:
  primary: '#FFE347'
  primary-hover: '#F5D638'
  primary-active: '#E8C529'
  primary-soft: '#FFF9D7'
  primary-muted: '#FFF0A3'
  primary-strong: '#7A6200'
  contrast: '#6457A6'
  contrast-hover: '#544895'
  contrast-active: '#473B82'
  contrast-soft: '#F1F0FB'
  contrast-muted: '#DEDBF3'
  contrast-strong: '#34295F'
  secondary: '#7D7ABC'
  secondary-soft: '#F3F2FB'
  secondary-strong: '#464081'
  accent: '#23F0C7'
  accent-soft: '#DBFFF7'
  accent-muted: '#A8F7E7'
  accent-strong: '#006F5D'
  warm: '#EF767A'
  warm-soft: '#FFF0F1'
  warm-strong: '#9A2F35'
  ink: '#18181B'
  action-ink: '#111111'
  muted: '#52525B'
  subtle: '#71717A'
  canvas: '#FAFAF7'
  canvas-mid: '#F3F2ED'
  canvas-deep: '#E7E4DC'
  surface: '#FFFFFF'
  surface-soft: '#FFFDF2'
  border: '#E4E4E7'
  border-strong: '#D4D4D8'
  dark-surface: '#2E2A24'
  error: '#DC2626'
  error-light: '#FEE2E2'
typography:
  display:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '3.75rem'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '0em'
  headline-lg:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '2.25rem'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '0em'
  headline-md:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '0em'
  title:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '0em'
  body:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: '0em'
  body-sm:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0em'
  label:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '0em'
  marketing-display:
    fontFamily: 'Instrument Serif, Georgia, Times New Roman, serif'
    fontSize: '4.25rem'
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: '0em'
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '12px'
  panel: '16px'
  card: '16px'
  soft-card: '20px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  '2xl': '24px'
  '3xl': '32px'
  '4xl': '48px'
  section: '80px'
  container: '1200px'
  narrow-container: '800px'
components:
  app-action-primary:
    backgroundColor: '{colors.action-ink}'
    textColor: '{colors.primary}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '10px 16px'
  app-action-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '10px 16px'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.ink}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: '10px 20px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.ink}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: '10px 20px'
  button-contrast:
    backgroundColor: '{colors.contrast}'
    textColor: '{colors.surface}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.full}'
    padding: '10px 20px'
  app-panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '20px'
  app-panel-soft:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '20px'
  app-list-row:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '12px'
  app-empty-state:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.muted}'
    rounded: '{rounded.panel}'
    padding: '32px'
  app-field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '10px 14px'
  app-chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.muted}'
    typography: '{typography.label}'
    rounded: '{rounded.full}'
    padding: '5px 10px'
---

# Design System: Sellr

## Overview

Sellr is a trust-native local marketplace for verified communities. The visual
system should feel like a calm campus market desk: structured, local,
approachable, and safer than a generic listing board. It should help buyers and
sellers compare items, understand trust context, and complete tasks quickly.

The product register is restrained. Design serves the marketplace workflow, so
authenticated screens should be dense, task-focused, and familiar. Public and
auth screens may carry more brand warmth, but signed-in surfaces should avoid
decorative dashboards, nested cards, glassmorphism, and generic AI product
mood.

The current launch focus is the web SLC/MVP. Preserve auth, onboarding,
community scoping, listing lifecycle, media upload, messaging, reporting, admin,
and readiness gates. Phase 6 AI, broad growth loops, payments, delivery,
ratings, and advanced reputation are deferred.

Key characteristics:

- Warm mustard identity, restrained by ink, off-white, and practical dividers.
- Item-first marketplace layouts with price, condition, pickup area, seller,
  and trust cues close together.
- Honest trust language that only describes backed product facts.
- Rows, dividers, and open sections before nested panels.
- Soft elevation used for hierarchy, not decoration.

## Colors

Sellr uses a warm, high-contrast marketplace palette: mustard for brand and key
actions, ink for decisive app actions, grape for focus and navigation, mint for
verified or successful trust cues, and coral for warnings or destructive
moments.

Primary:

- Mustard `primary` (`#FFE347`) is the recognizable Sellr signal. Use it for
  brand highlights, legacy primary buttons, selection accents, and warm launch
  moments. Pair it with ink text, not white text.
- Mustard soft `primary-soft` (`#FFF9D7`) and muted `primary-muted`
  (`#FFF0A3`) support callouts, listing quality hints, and gentle backgrounds.
- Mustard strong `primary-strong` (`#7A6200`) is for readable text on mustard
  tints.

Contrast:

- Dusty grape `contrast` (`#6457A6`) supports active navigation, links, focus
  states, secondary CTAs, and selected controls.
- Use `contrast-soft` (`#F1F0FB`) and `contrast-muted` (`#DEDBF3`) for quiet
  selected states without turning the page purple.

Trust and state:

- Mint `accent` (`#23F0C7`) and `accent-strong` (`#006F5D`) are for verified
  contact, active community membership, successful actions, pickup-friendly
  signals, and trust-positive badges.
- Coral `warm` (`#EF767A`) and `warm-strong` (`#9A2F35`) are for warnings,
  destructive actions, form errors, report language, and high-attention seller
  prompts.
- Error red `error` (`#DC2626`) is allowed for standard validation errors when
  a conventional error color is clearer than brand coral.

Neutrals:

- Ink `ink` (`#18181B`) is primary text and text on mustard.
- Action ink `action-ink` (`#111111`) powers the refreshed
  `app-action-primary` pattern.
- Muted text `muted` (`#52525B`) and subtle text `subtle` (`#71717A`) carry
  metadata, helper text, timestamps, and secondary context.
- Canvas `canvas` (`#FAFAF7`) is the warm app background. Use `surface`
  (`#FFFFFF`) for content surfaces and `canvas-mid` (`#F3F2ED`) for quiet
  background contrast.

Named rules:

- The mustard rule: mustard should make Sellr recognizable, but it should not
  flood authenticated workflows.
- The trust-color rule: mint means backed trust, success, or availability. Do
  not use it as decoration.
- The no-fake-proof rule: never introduce testimonials, safety claims, or
  verified language that the product does not support.

## Typography

Sellr uses Inter for product UI and dense marketplace work. Instrument Serif is
available for public marketing moments only, where a softer editorial accent
helps the brand feel warmer.

Display font: Inter, with system sans fallback. Marketing display may use
Instrument Serif. Body font: Inter. Label font: Inter.

Hierarchy:

- Display, Inter 700 at `3.75rem`, is reserved for large public or top-level
  moments. Do not use hero-scale type inside task panels, admin screens, inbox
  threads, listing forms, or compact cards.
- Headline large, Inter 700 at `2.25rem`, is for page titles and major public
  sections.
- Headline medium, Inter 600 at `1.5rem`, is for section headers and primary
  panel titles.
- Title, Inter 600 at `1.25rem`, is for listing titles, card headers, and
  compact route sections.
- Body, Inter 400 at `1rem`, is for descriptions and instructions. Cap prose
  line length around 65 to 75 characters.
- Body small and label are for metadata, chips, timestamps, helper text, and
  controls. Labels should stay readable and concise.

Named rules:

- The density rule: operational screens use modest type scale and strong weight
  contrast, not oversized headings.
- The zero-tracking rule: do not use negative letter spacing. Current app tokens
  keep tracking at zero.
- The verb rule: buttons and labels use direct verbs such as `Browse`, `Sell`,
  `Publish listing`, and `Contact seller`.

## Layout

Sellr uses a hybrid marketplace shell. Public pages introduce the community
promise, while signed-in app views prioritize browse, sell, message, and manage
workflows.

Layout principles:

- Use constrained content widths, generally `1120px` to `1200px`; use the
  `800px` narrow container for focused forms and prose.
- Keep listing grids responsive with stable image ratios and card dimensions.
- Keep the primary object visible: listing, seller, conversation, report, or
  community context should lead before explanation.
- Use full-width sections, dividers, and list rows before adding more panels.
- Use cards for repeated listing previews, form panels, modals, and genuinely
  framed tools. Avoid cards inside cards.
- Keep trust cues near the thing they affect: listing, seller, profile,
  report, or conversation.
- Mobile layouts prioritize browse, sell, contact, and reply actions. Do not
  let action labels overflow or push content sideways.

Spacing:

- `4px` and `8px` are micro-spacing for icons, chips, and tight controls.
- `12px` to `16px` are default row and form gaps.
- `20px` to `24px` are standard panel padding.
- `32px` to `48px` are route-level grouping gaps.
- `80px` is reserved for larger public section rhythm.

## Elevation & Depth

Depth is a hybrid of borders, tonal layering, and restrained shadows. Borders
and dividers do most structural work. Shadows should clarify hierarchy or hover
state, not create decorative floating dashboards.

Shadow vocabulary:

- Extra small shadow, `0 1px 2px rgba(24, 24, 27, 0.04)`, supports chips,
  fields, and low-risk interactive controls.
- Small shadow,
  `0 1px 3px rgba(24, 24, 27, 0.06), 0 1px 2px rgba(24, 24, 27, 0.04)`,
  supports soft panels and quiet brand surfaces.
- App card shadow,
  `0 16px 34px -28px rgba(24, 24, 27, 0.26), 0 1px 2px rgba(24, 24, 27, 0.05)`,
  supports primary cards and listing surfaces.
- App card hover shadow,
  `0 18px 38px -30px rgba(24, 24, 27, 0.28), 0 2px 5px rgba(24, 24, 27, 0.06)`,
  supports subtle hover lift.
- Glow shadow, `0 0 0 3px rgba(100, 87, 166, 0.18)`, is the focus and field
  emphasis treatment.

Named rules:

- The divider-first rule: if a row, section, or border can express hierarchy,
  prefer that before adding more shadow.
- The no-glass rule: avoid frosted blur and decorative glass treatments in core
  marketplace flows.
- The hover-lift rule: hover motion should be short, small, and tied to
  interactivity.

## Shapes

Sellr is softly sturdy, not bubbly. Most app surfaces use modest radii that
feel modern while preserving a utilitarian marketplace rhythm.

Shape scale:

- `6px` is the smallest radius for skeletons and compact utility details.
- `8px` to `12px` is the default control range for inputs, compact cards, and
  small panels.
- `16px` is the standard app panel and card radius.
- `20px` is reserved for softer marketing cards or larger feature surfaces.
- `9999px` is used for pills, chips, badges, and primary app actions.

Named rules:

- The consistency rule: controls in the same workflow should share radius and
  vocabulary.
- The restraint rule: avoid large rounded rectangles for every object. Let
  dividers, rows, and spacing do more work.

## Components

Buttons:

- App primary actions use `app-action-primary`: action ink background, mustard
  text, full pill radius, icon gap, bold label, and a small hover shadow.
- Legacy and marketing primary buttons may use mustard background with ink
  text when the surrounding section needs a brighter brand action.
- Secondary buttons use white or canvas surfaces, borders, ink or grape text,
  and no decorative gradients.
- Destructive buttons use coral or conventional red with explicit copy.
- Disabled buttons should reduce opacity and block hover or lift states.

Panels and cards:

- `app-panel` is the default elevated white content surface.
- `app-panel-soft` is a warmer launch, hero, preview, or dashboard treatment.
- `app-panel-dark` is reserved for intentional high-contrast moments, not the
  default app mood.
- Listing cards prioritize image, price, title, condition, pickup/community
  cue, and seller/trust signal.
- Repeated management content should often use `app-list-row` instead of
  another nested card.

Chips and badges:

- `app-chip` is the default compact metadata pill.
- Trust-positive badges use mint soft backgrounds and strong mint text.
- Primary/mustard badges call attention to offers, listing status, or quality
  hints.
- Grape badges indicate active navigation, selected filters, or quiet secondary
  context.

Inputs and forms:

- `app-field` and `.input` use white backgrounds, ink text, modest radius,
  subtle shadow, and grape focus treatment.
- Errors must be visible, associated with the field where appropriate, and not
  rely on color alone.
- Listing creation should feel guided and compact: grouped fields, practical
  helper text, early validation, clear required states, and a prominent publish
  action.

Empty, loading, and alerts:

- `app-empty-state` uses dashed borders, low elevation, and actionable copy.
- Skeletons use warm neutral shimmer and stable dimensions.
- `app-alert` uses coral soft background, coral border, and strong readable
  text. Alerts should say what happened and what the user can do next.

Navigation:

- Authenticated navigation should stay compact and task-focused.
- Preserve obvious paths to Browse, Sell, Dashboard/Home, Inbox, Notifications,
  Profile, and Admin when the user has access.
- Admin and seller screens should feel operational, dense, and clear rather
  than decorative.

Motion:

- Use 150ms to 250ms transitions for hover, focus, reveal, and feedback.
- Motion must convey state or affordance. Do not add ambient motion to core
  marketplace flows.
- Avoid animating layout properties that can cause jank.

## Do's and Don'ts

Do:

- Keep listings, people, messages, reports, and community context visible before
  explanatory copy.
- Use `app-panel`, `app-panel-soft`, `app-list-row`, `app-empty-state`,
  `app-alert`, `app-field`, `app-chip`, `app-action-primary`, and
  `app-action-secondary` before adding new one-off styles.
- Pair mustard backgrounds with ink text.
- Use grape for focus, navigation, selected states, and links.
- Use mint only for backed trust-positive or success states.
- Keep admin and seller flows utilitarian and dense.
- Preserve loading, empty, error, validation, disabled, and success states.
- Check mobile text fit, tap targets, focus states, and horizontal overflow.

Don't:

- Do not implement Phase 6 AI or let AI mood define the marketplace foundation.
- Do not add broad product scope such as payments, delivery, ratings, advanced
  reputation, growth loops, or broad admin tooling.
- Do not introduce a new design-system library for the current web SLC.
- Do not use decorative glassmorphism, gradient text, heavy nested cards, or
  generic dashboard hero metrics.
- Do not overuse purple, mint, coral, or mustard until the app reads as one hue.
- Do not use fake testimonials, fake launch proof, or unbacked safety claims.
- Do not hide essential listing or contact actions behind vague panels.
- Do not make public marketing treatments the default for signed-in app
  surfaces.
