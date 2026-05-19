# UI Upgrade Reference Workflow

Use this when starting a new inspiration-led UI upgrade session. The goal is to
bring hand-picked references into Sellr deliberately, without copying visual
skins, reopening completed route work by accident, or adding product scope.

## Source Of Truth

Read these first:

1. `AGENTS.md`
2. `PRODUCT.md`
3. `DESIGN.md`
4. `docs/current-state-and-scope.md`
5. `docs/design-language.md`
6. `docs/ui-ux-overhaul-guide.md`
7. `docs/web-next-development-guide.md`
8. `apps/web/README.md`
9. `apps/web/app/globals.css`

`PRODUCT.md` explains who Sellr is for and what the UI must accomplish.
`DESIGN.md` is the machine-readable visual system in the Google DESIGN.md
format. `docs/design-language.md` and `docs/ui-ux-overhaul-guide.md` give the
expanded Sellr-specific rationale and route history.

## Reference Intake

Before touching code, make a compact reference brief in the session notes or in
a temporary PR comment. For each source, capture:

| Field             | What to record                                                            |
| ----------------- | ------------------------------------------------------------------------- |
| Source            | URL, screenshot, PDF, product name, or file path                          |
| Surface           | Landing, browse, listing detail, form, inbox, admin, motion, tokens, etc. |
| What Works        | The exact quality worth learning from                                     |
| What To Avoid     | Anything that would break Sellr's scope, trust, or usability              |
| Sellr Translation | The concrete Sellr-specific idea, not a copy of the source                |
| Candidate Files   | Routes, components, or CSS utilities likely affected                      |
| Verification      | Browser, test, lint, typecheck, or build checks needed                    |

Do not commit third-party screenshots, copied assets, or proprietary content
unless licensing and attribution are clear. Link sources instead.

## Extraction Rules

For each inspiration source, translate patterns at the level of intent:

- Section rhythm: how attention moves from object to action.
- Information hierarchy: what is shown first, second, and last.
- Interaction model: inline panel, sheet, popover, drawer, row, tab, or page.
- Density: how much work the screen supports without feeling crowded.
- Trust placement: where identity, status, proof, or safety cues appear.
- Motion role: whether movement clarifies state, focus, or progress.
- Responsive behavior: what collapses, sticks, hides, or becomes primary.

Avoid copying:

- Brand palettes, logos, illustration styles, proprietary imagery, or exact
  layouts.
- Interaction patterns that require new backend product scope.
- AI, payments, ratings, delivery, logistics, or growth-loop behavior.
- Visual novelty that makes marketplace tasks slower.

## Slice Planning

After intake, choose one small implementation slice. Good slice shapes:

- One route plus shared utilities it already uses.
- One reusable component pattern across two or three high-impact surfaces.
- One design-token adjustment with clearly visible inherited improvements.
- One responsive or accessibility repair tied to a specific screen group.
- One public/auth brand pass only if it does not disturb signed-in task flows.

Poor slice shapes:

- A full app redesign in one PR.
- A new component library.
- Route rewrites without a named regression or reference-backed objective.
- Cosmetic changes that alter auth, community scoping, listing lifecycle,
  uploads, messaging, reporting, admin, or readiness behavior.

## Decision Log

For each implemented slice, record:

- Reference source used.
- Design decision made.
- Why it fits Sellr.
- Files changed.
- Behavior explicitly preserved.
- Verification run.
- Any visual or interaction risk left open.

The decision log can live in the PR description unless the decision needs to
become long-term project guidance.

## Implementation Guardrails

- Keep the current web SLC behavior unchanged unless the user explicitly asks
  for product behavior changes.
- Do not implement Phase 6 AI.
- Do not add a new design-system library.
- Prefer existing CSS tokens and utilities in `apps/web/app/globals.css`.
- Extend `app-panel`, `app-panel-soft`, `app-list-row`, `app-empty-state`,
  `app-alert`, `app-field`, `app-chip`, `app-action-primary`, and
  `app-action-secondary` when patterns repeat.
- Keep marketplace, listing, seller, inbox, notification, profile, and admin
  screens operational and dense.
- Auth and public pages can carry more brand personality; signed-in app
  surfaces should stay calmer.
- Use visual assets only when they are approved, generated for the project, or
  clearly license-safe.

## Verification

Run checks scaled to the changed files:

```bash
pnpm --filter @sellr/web lint
pnpm --filter @sellr/web typecheck
pnpm --filter @sellr/web build
```

For shared flow or readiness changes, also run:

```bash
pnpm slc:ready
```

For visual work, use Browser smoke on desktop and mobile for every changed
route plus at least one adjacent route that uses the same component or token.
Check for:

- No route-blocking render errors.
- No horizontal overflow.
- No clipped or overlapping text.
- Clear focus states.
- Usable loading, empty, error, validation, disabled, and success states.
- Trust cues still near the object they affect.

## Suggested Opening Prompt

```text
Read AGENTS.md, PRODUCT.md, DESIGN.md, docs/ui-upgrade-reference-workflow.md,
docs/current-state-and-scope.md, docs/design-language.md,
docs/ui-ux-overhaul-guide.md, docs/web-next-development-guide.md,
apps/web/README.md, and apps/web/app/globals.css.

I will provide hand-picked UI references and inspirations. First create a
reference-intake brief that identifies what each source contributes, what Sellr
should avoid copying, and the smallest safe implementation slices. Do not
implement Phase 6 AI, do not add broad product scope, do not add a new
design-system library, and preserve current SLC behavior.
```
