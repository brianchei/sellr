# Sellr Design Language

Last updated: May 12, 2026.

Sellr is a trust-native local marketplace for high-trust, peer-to-peer commerce. The product should feel structured, local, approachable, and safer than a generic listing board. It should be bright enough to feel memorable, but calm enough that buyers and sellers can scan listings, make decisions, and complete tasks quickly.

## Product Feel

Sellr should feel:

- Clear, trustworthy, and community-oriented.
- Modern and friendly without becoming decorative or noisy.
- Structured enough to improve listing quality and transaction intent.
- Lightweight enough for a simple web MVP.
- More polished than a broad social marketplace, but still fast and familiar.

The visual language should support confidence: clean hierarchy, obvious actions, readable listing information, and trust signals that are easy to understand at a glance.

## Design Principles

1. **Trust before flair.** Use color, badges, and motion to clarify state or intent, not to decorate every surface.
2. **Structured, not sterile.** Forms and listing cards should feel organized, but still warm and consumer-friendly.
3. **Local signals are first-class.** Community, pickup area, seller identity, and verification cues should be visible where they help decisions.
4. **A few complete flows beat many unfinished ones.** Every visible control should work, explain itself, or be clearly marked as unavailable.
5. **Scanability wins.** Marketplace pages should make price, condition, location, image, and seller intent easy to compare.

## Color System

The Sellr logo uses mustard and white. Mustard is the primary brand color and
highlight color. The refreshed web app pairs mustard with ink/black surfaces for
high-contrast primary actions, while dusty grape, mint, and warm coral support
focus, trust-positive, and warning/destructive states.

## Brand Assets

Current checked-in brand assets live in `apps/web/public/brand`:

- `sellr-app-icon.png`: app icon and metadata icon source.
- `sellr-logo-mark.png`: compact logo mark used in headers and compact app UI.
- `sellr-logo-wordmark.png`: wordmark source for Open Graph/social previews.
- `sellr-symbol.png`: production standalone symbol for compact brand moments.
- `sellr-symbol-transparent.png`: transparent standalone symbol variant.
- `sellr-symbol-large.png`: large standalone symbol asset for hero or empty-state
  artwork.
- `sellr-logo-full.png`: production full logo lockup.
- `sellr-logo-full-transparent.png`: transparent full logo lockup.
- `sellr-logo-full-light.png`: full logo lockup on a light background.
- `sellr-logo-full-alt.png`: alternate full logo lockup.
- `sellr-logo-light-reversed.png`: reversed logo for dark surfaces.
- `sellr-logo-dark-monochrome.png`: monochrome logo for constrained or print-like
  contexts.
- `sellr-app-icon-square.png`: square app icon asset.
- `sellr-app-icon-transparent.png`: transparent app icon asset.
- `sellr-app-icon-1024.png`: high-resolution app icon source.
- `apple-touch-icon-180.png`: Apple touch icon source.
- `favicon-16.png`, `favicon-32.png`, and `favicon-48.png`: favicon sources.
- `maskable-pwa-icon-512.png`: maskable PWA icon source.

The Expo app mirrors the icon assets in `apps/mobile/assets`. Prefer these files
over recreating the mark in CSS or inline SVG.

### Core Palette

| Token | Hex | Role |
| --- | --- | --- |
| `--color-brand-primary` | `#FFE347` | Mustard. Primary brand color, primary CTA background, logo color, key highlights. |
| `--color-brand-contrast` | `#6457A6` | Dusty grape. Contrast color, navigation active states, links, secondary CTAs, focus support. |
| `--color-brand-secondary` | `#7D7ABC` | Soft periwinkle. Secondary surfaces, quiet badges, category accents. |
| `--color-brand-accent` | `#23F0C7` | Tropical mint. Verified/local trust cues, success states, pickup-friendly signals. |
| `--color-brand-warm` | `#EF767A` | Light coral. Human warmth, warnings, destructive actions, seller prompts. |

### Recommended Neutral Tokens

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink` | `#18181B` | Primary text and text on mustard. |
| `--color-muted` | `#52525B` | Secondary text. |
| `--color-subtle` | `#71717A` | Tertiary text and metadata. |
| `--color-border` | `#E4E4E7` | Default borders and dividers. |
| `--color-surface` | `#FFFFFF` | Cards, forms, and elevated surfaces. |
| `--color-canvas` | `#FAFAF7` | App background. Warm off-white. |
| `--color-canvas-tint` | `#FFF9D7` | Soft mustard-tinted callouts. |

### Usage Rules

- Use mustard as the recognizable brand signal, but pair it with dark text or
  dark surfaces rather than white text.
- In the refreshed web app, primary task actions may use an ink/black background
  with mustard text when that improves contrast and makes the action feel
  decisive.
- Use dusty grape when white text is required on a colored background.
- Use tropical mint for trust-positive cues such as verified, local, available, or pickup-friendly states.
- Use coral sparingly for destructive or high-attention states.
- Use soft periwinkle for quiet secondary UI, not as the dominant page color.
- Use warm brand gradients intentionally. The current web app uses a soft
  mustard/off-white/periwinkle app shell and stronger marketing gradients on the
  landing page; avoid introducing unrelated rainbow gradients.
- Do not make the interface feel one-note purple. Mustard should remain the recognizable brand signal, supported by grape and mint.

### Accessibility Notes

- Mustard on white does not provide enough contrast for text. Use mustard as a background with dark ink text.
- White text on mustard should be avoided except in the logo when the logo has been specifically designed for that use.
- Dusty grape works well for accessible text, links, and buttons on light backgrounds.
- Coral and periwinkle need careful contrast checks before being used for normal body text.
- Focus states should be obvious. Prefer a dusty grape focus ring with a subtle mustard outer glow or offset.

## Typography

Sellr uses **Inter** for the MVP.

Inter supports the current product goals because it is readable, neutral, fast to ship, and works well for dense marketplace interfaces. It should be used with a simple type scale and strong hierarchy rather than decorative typography.

### Type Guidance

- Page titles should be clear and restrained, not oversized marketing headlines inside app views.
- Listing titles should be readable at card sizes and not rely on truncation alone.
- Metadata should use smaller type with enough contrast to remain scannable.
- Buttons and labels should use concise verbs: `Browse`, `Sell`, `Publish listing`, `Contact seller`.
- Avoid negative letter spacing.

## Layout

Sellr should use a **hybrid marketplace shell**.

The app should combine a focused product shell with a consumer-friendly marketplace browsing experience:

- Compact top navigation for authenticated web flows.
- Warm gradient authenticated app shell with glassy/elevated panels.
- Responsive marketplace grid with clear image, price, condition, and location hierarchy.
- Seller forms that feel structured and guided, not like a generic blank form.
- Dashboard and account areas that are denser and more operational.
- Mobile layouts that prioritize browse, sell, and contact actions.

### Layout Rules

- Use constrained content widths for app pages, generally `1120px` to `1200px`.
- Keep listing grids responsive with stable card dimensions.
- Use full-width page sections or unframed layouts instead of nested cards.
- Use cards for repeated items, listing previews, form panels, and modals.
- Keep core actions near the content they affect.
- Make empty, loading, and error states feel intentional and actionable.

## Shape, Spacing, and Elevation

Sellr should feel polished, modern, and sturdy rather than bubbly. The refreshed
web app uses larger rounded panels for warmth, while keeping controls and dense
marketplace content compact enough to scan.

- Default utility/control radius: `8px` to `12px`.
- Refreshed app panels: `24px`.
- Soft marketing and preview cards: `20px` to `32px` depending on scale.
- Compact controls: `8px` to `12px`.
- Badges and pills: fully rounded.
- Listing cards: generally `20px` to `24px` in the refreshed web app.
- Modals and larger panels: `20px` to `24px` when extra softness helps.
- Shadows should be soft and used for layering, not decoration.
- Borders should still do most of the structural work.

## Components

### Buttons

- Primary web app actions should use the refreshed `app-action-primary` pattern:
  ink/black background, mustard text, pill radius, and a small lift on hover.
- Legacy or marketing primary buttons may still use mustard background with ink
  text when that fits the surrounding section.
- Secondary buttons should use white or canvas surfaces with borders and ink or
  grape text.
- High-contrast alternate buttons may use dusty grape background with white text.
- Destructive buttons should use coral or a standard red token with clear copy.
- Buttons should include icons where they improve recognition, especially for navigation and tool-like actions.

### Listing Cards

Listing cards should prioritize:

1. Image or image placeholder.
2. Price.
3. Title.
4. Condition.
5. Pickup area or community cue.
6. Seller/trust signal where available.

Cards should avoid decorative clutter. Badges should clarify trust, condition, availability, or community context.

### App Surfaces

The refreshed web app uses reusable surface utilities:

- `app-shell-bg`: warm gradient canvas with subtle grid texture for authenticated
  surfaces and standalone auth pages.
- `app-panel`: elevated white panel for primary cards, forms, empty states, and
  admin surfaces.
- `app-panel-soft`: warmer panel treatment for hero/dashboard/preview surfaces.
- `app-chip`: compact pill for metadata and quiet status cues.
- `app-action-primary` and `app-action-secondary`: primary and secondary app
  action patterns.

Prefer these utilities for new web surfaces before introducing one-off panel or
button styles.

### Forms

Seller listing creation should feel guided and confidence-building:

- Group related fields into clear sections.
- Use labels and helper text for structured listing requirements.
- Validate early and explain errors plainly.
- Show required fields clearly.
- Keep the publish action visually prominent.
- Avoid hiding essential fields behind advanced controls in the MVP.

### Trust Signals

Trust UI should be simple and honest:

- `Active community member`
- `Verified contact`
- `Local pickup`
- `Responsive seller` only when backed by real data
- `Report listing`

Do not imply KYC, background checks, reputation, or transaction guarantees unless the product actually supports them.

## Motion

Motion should be minimal and functional:

- Fast hover and press states for buttons and cards.
- Gentle loading skeletons.
- Short transitions for menus, filters, and form feedback.
- No decorative ambient motion in core marketplace flows.
- Interactive marketing elements are acceptable when they demonstrate the actual
  product, such as the landing page app preview tabs and pickup-radius control.

## Content Voice

Sellr copy should be clear, direct, and calm.

Use:

- `Create a listing`
- `Publish listing`
- `Contact seller`
- `Choose your community`
- `No listings yet`
- `This seller is in your community`

Avoid:

- Overpromising safety.
- Fake urgency.
- Vague trust claims.
- Long onboarding explanations.
- Marketing copy inside task-focused app screens.

## CSS Token Draft

```css
:root {
  --color-brand-primary: #ffe347;
  --color-brand-contrast: #6457a6;
  --color-brand-secondary: #7d7abc;
  --color-brand-accent: #23f0c7;
  --color-brand-warm: #ef767a;

  --color-ink: #18181b;
  --color-muted: #52525b;
  --color-subtle: #71717a;
  --color-border: #e4e4e7;
  --color-surface: #ffffff;
  --color-canvas: #fafaf7;
  --color-canvas-tint: #fff9d7;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
}
```

## Implementation Notes

- Update the existing web CSS tokens to reflect this language before broad UI polish.
- Keep Inter unless there is a later brand reason to revisit typography.
- Prefer completing the marketplace, seller listing, listing detail, and contact flows before investing in decorative brand moments.
- Use the design language as a product filter: bright, local, trustworthy, complete.
- Keep `docs/web-next-development-guide.md` as the source of truth for phase
  status and remaining product direction.
