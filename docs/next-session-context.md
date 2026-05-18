# Sellr Next Session Context

Use this brief to continue production hardening or development in a new agent
session.

## Product And Scope

Sellr is a trust-native local marketplace for high-trust local communities. The
current priority remains the web SLC/MVP: a complete buyer/seller loop that
feels clear, trustworthy, and usable without broad marketplace scope creep.

The current web SLC includes:

- Production Resend email OTP login, Twilio phone fallback, and community
  onboarding.
- Marketplace browse/search/filter and listing detail with seller trust signals.
- Structured listing creation, durable R2-backed listing photo upload, edit,
  publish/unpublish, delete, and sold-listing lifecycle.
- Media lifecycle cleanup for abandoned uploads, deleted/replaced listing
  images, and explicit admin listing removals from reports.
- Seller storefront-lite pages.
- Buyer contact, inbox threads, replies, notifications, and unread badges.
- Basic reporting plus admin-only report review and explicit listing removal.
- Admin-only community setup for community details, invite codes, and member
  role/status management, including an explicit `/admin/community`
  management-community switcher for admins with multiple active admin
  memberships.
- Dashboard profile/trust preview and seller readiness panel.
- Vercel Web Analytics and Speed Insights in the web app root layout.
- Phase 1 web polish: refreshed public landing page, production brand assets,
  metadata/icons, interactive app preview, warm gradient app shell, elevated app
  panels, high-contrast actions, and updated marketplace/listing/messaging/admin
  visual surfaces.
- Phase 2 identity hardening has shipped: web auth retries session hydration and
  same-origin API calls through refresh-cookie rotation, phone fallback sign-in
  normalizes US numbers to E.164 `+1`, and listing post/contact seller actions
  require a real display name, verified contact, and active community
  membership.
- `/profile` now provides display name editing, profile photo upload, verified
  contact display, storefront access, and readiness guidance using existing app
  panel/form styling. Account navigation, high-intent profile-completion CTAs,
  dashboard readiness guidance, seller-owned listing identity previews, and
  buyer-facing seller-card cache refreshes now point users toward that profile
  surface.
- Phase 3 community product work has shipped with active community summaries on
  `/auth/me` and a quiet authenticated app-shell community indicator/switcher for
  multi-community users. A member-only `/communities/[communityId]` homepage now
  gives members community details, membership context, stats, guidance, recent
  listings, browse/sell actions, and lightweight Badger Market/campus
  presentation cues scoped to that community. Existing members can use
  `/communities/join` to join another community by invite code or verified
  email-domain match, then switch into that community context. Members can leave
  a community from its homepage after unpublishing active listings, or confirm
  removal of their active/draft listings while leaving. Admins can also switch
  which active admin community they are managing on `/admin/community` and edit
  basic community details, access method, email domain, member-facing
  rules/guidance, and lightweight presentation config for descriptions, accent
  color, local areas, pickup guidance, and optional approved imagery URLs. Admin
  member management includes search, role/status filters, clearer access action
  labels, inactive-access reason context, and no-results states. Report cards
  surface target member context, link into the relevant community/member
  management view, support scoped report-linked demote/deactivate/suspend
  actions, and show moderation history while keeping report status review
  separate.
- Phase 4 listing and browse work is complete for the current web SLC:
  sell/edit flows include listing-strength guidance, durable photo upload with
  browser-assisted HEIC conversion, quick-pick price and pickup helpers, buyer
  preview, and AM/PM pickup timing; marketplace browse includes server-backed
  search, category, condition, photo-only, price range, pickup-radius, and sort
  controls; listing cards and detail pages surface seller trust cues,
  approximate pickup radius, photo count, active listing count, and
  at-a-glance buyer context.
- Phase 5 trust, moderation, and messaging work is complete for the current web
  SLC: users can archive/hide conversations without deleting shared history,
  view and restore archived threads, and receive them back in the active inbox
  when a new message arrives. Admin report/member moderation remains scoped and
  auditable, and profile/listing/storefront/inbox trust language now uses
  consistent backed signals such as verified contact, active community
  membership, profile photo presence, and active listings.

Before Phase 6 AI listing-assistant work, finish the UI/UX overhaul closeout in
`docs/ui-ux-overhaul-guide.md`. The route/repo audit, UX diagnosis, onboarding
strategy, screen-by-screen direction, component guidance, microcopy,
accessibility bar, metrics, and Phase A-F plan are documented there. The
implementation passes through Phase E are now shipped on `main`: Phase B
foundation utilities and route-level passes for onboarding/auth entry, app
navigation, signed-in home/dashboard, marketplace filters, listing detail,
listing form, seller inventory, inbox/thread hierarchy, notifications, admin
density, and profile/storefront trust hierarchy. Phase F closeout is also
complete for the current web SLC: docs have been reconciled, desktop/mobile
route smoke has run, accessibility/state coverage was audited, and
`pnpm slc:ready` passed. Preserve the current SLC behavior, keep Phase 6 AI
deferred unless explicitly requested, and avoid another broad route redesign
unless a fresh audit finds a concrete regression.

May 17 Phase F progress: Browser smoke covered the main route list at 1280px
desktop and 390px mobile, focused web checks passed, and `pnpm slc:ready`
passed locally outside the sandbox after the authenticated web route smoke was
made robust for multi-community demo users. Populated inbox/thread desktop
rendered QA also passed through Arc/Computer Use after `pnpm smoke:inbox`
seeded the buyer/seller thread, and authenticated mobile inbox/thread QA passed
in the in-app Browser at 390px with the same buyer fixture. Optional
launch-evidence risks are authenticated no-community onboarding visual QA if
final signoff requires a screenshot, and a seeded incomplete-profile visual
Browser smoke if a launch fixture is added.

May 17 follow-up: final accessibility/state audit covered dialogs, filters,
forms, empty/loading/error/success states, disabled controls, focus behavior,
and mobile tap/overflow risk. The audit found and fixed a concrete `/login`
field-error association gap: invalid email/code states now reference the visible
`login-error` alert from `aria-describedby`, with focused web tests added.
`pnpm slc:ready` passed after a transient authenticated web-route smoke failure
cleared on isolated rerun.

May 17 follow-up: report dialog focus, keyboard containment, local validation,
and success-state focus are now hardened with component tests. Browser smoke
verified the report action on a buyer-visible listing opens correctly, focuses
the details field, wraps keyboard focus, announces local validation, and returns
focus to the trigger on Escape.

May 17 follow-up: non-own listing contact-send and profile-readiness gates now
have page-level tests. Failed profile checks block seller contact with a retry
action, incomplete profile states hide the contact submit action, send failures
clear once the buyer edits the message, and Browser smoke verified a
buyer-visible listing reaches `Message sent`.

May 17 follow-up: report submit now has API smoke coverage through
`pnpm smoke:reports`, which creates a real listing report and verifies admin
review visibility. The report smoke is wired into `pnpm slc:ready`. The report
dialog also exposes a busy submit state, locks details while pending, and clears
failed-submit copy once the reporter edits the report.

May 17 follow-up: populated inbox thread behavior now has API smoke coverage
through `pnpm smoke:inbox`, which creates or reuses a buyer/seller listing
thread, sends replies from both participants, verifies populated listing/peer
thread context, checks archived filtering, and confirms a new reply restores an
archived thread to the active inbox. The inbox smoke is wired into
`pnpm slc:ready`. The thread reply form now exposes a busy submit state, locks
the composer while pending, and clears failed-submit copy once the sender edits
the reply. Desktop and 390px mobile rendered QA verified the buyer `/inbox` list
and latest Walnut study desk thread with populated conversation context, seller
trust, report/archive actions, pickup safety copy, quick replies, and the
disabled empty-reply state. The mobile pass also verified a quick reply fills
the composer and enables `Send reply` without submitting another message.

May 17 follow-up: populated notifications behavior now has API smoke coverage
through `pnpm smoke:notifications`, which creates real message notifications,
verifies unread filtering, marks one notification read, and confirms
mark-all-read clears remaining unread state. The notifications smoke is wired
into `pnpm slc:ready`. Browser smoke also verified populated `/notifications`
at desktop and mobile widths, including the mark-all-read interaction.

May 17 follow-up: logged-out auth and email-first onboarding now have API/HTML
smoke coverage through `pnpm smoke:auth-onboarding`, which checks logged-out
`/auth/me`, `/login` and `/onboarding` HTML responses, verifies a reusable
`@wisc.edu` smoke email, resets that smoke user's community membership, joins
by verified email domain, and confirms `/dashboard` reachability. The smoke is
wired into `pnpm slc:ready`. Browser smoke also verified the logged-out
`/login` screen; Browser text entry was blocked by the local virtual clipboard,
so authenticated no-community `/onboarding` visual QA remains a possible final
signoff follow-up if a screenshot is required.

Defer payments, escrow, advanced KYC, ratings/reputation, complex moderation,
delivery/logistics, advanced AI/recommendations, and native mobile polish unless
explicitly requested.

## Current Production State

- GitHub Actions `ci` passes.
- GitHub Actions `Deploy` applies production Prisma migrations on pushes to
  `main` and manual dispatch.
- GitHub `main` is protected; changes should go through pull requests.
- Supabase is the production Postgres/PostGIS database.
- Railway hosts the Fastify API and Redis.
- Vercel hosts the production web app:

```text
https://sellr-ai.com
```

- Current public Railway API origin:

```text
https://api.sellr-ai.com
```

- API health URL:

```text
https://api.sellr-ai.com/health
```

- Provider backing URLs remain available for diagnostics and rollback:
  `https://sellr-web.vercel.app` and
  `https://api-production-be29.up.railway.app`.

- Production login uses Resend email OTP for verified student email, with
  Twilio SMS retained as a phone fallback for invite-only users.
- Same-origin Vercel `/api/v1` rewrites to Railway have been verified; the
  expected unauthenticated proxy check is `{"error":"Unauthorized"}` from:

```text
https://sellr-ai.com/api/v1/auth/me
```

- Durable listing image storage has been verified: new uploads return an R2/CDN
  URL beginning with `https://cdn.sellr-ai.com`.
- Production `Badger Market` has been bootstrapped for `wisc.edu` email-domain
  join, and invite code `BADGER2026` works as a secondary join path.
- Production smoke has passed for `@wisc.edu` email OTP, community join,
  listing creation with image upload, listing detail, buyer contact, inbox,
  notifications, seller listing lifecycle, and test-listing deletion.
- The Phase 1 production visual smoke pass also passed across the refreshed
  public, core authenticated, and admin web surfaces.
- Media lifecycle cleanup has been deployed and production-smoke-tested for the
  main paths: pending/attached media tracking, image replacement, listing
  deletion, and explicit admin listing removal from reports.

## Important Deployment Decisions

- Do not blindly add `"type": "module"` to `apps/api/package.json`. That starts
  a broader NodeNext ESM migration because relative imports need explicit
  `.js` extensions.
- The current deploy-safe API start command is:

```json
"start": "tsx src/index.ts"
```

- This avoids the Prisma 7 generated-client runtime crash seen when Railway ran
  `node dist/index.js`.
- `NO_CACHE=1` was only a temporary Railway cache repair variable. Remove it if
  it is still present after a successful clean deploy.
- The web app should preserve httpOnly cookie auth by calling same-origin
  `/api/v1` in the browser. Vercel/Next rewrites that path to Railway through
  `INTERNAL_API_URL=https://api.sellr-ai.com`.
- `turbo.json` must allow production web build env vars such as
  `INTERNAL_API_URL`, `NEXT_PUBLIC_USE_SAME_ORIGIN_API`,
  `NEXT_PUBLIC_REALTIME_URL`, `NEXT_PUBLIC_LISTING_IMAGE_CDN_URL`, and
  `NEXT_PUBLIC_SITE_URL`; otherwise Vercel can silently bake local fallback
  values into the build.
- Do not set `NEXT_PUBLIC_API_URL` for the normal production web flow unless the
  auth architecture is intentionally changed.
- Production listing images should use `https://cdn.sellr-ai.com`. Do not
  switch back to a temporary `r2.dev` URL unless debugging a CDN incident.

## Required Production Env Vars

Railway API:

```text
DATABASE_URL
DIRECT_URL
REDIS_URL
JWT_SECRET
ALLOWED_ORIGINS=https://sellr-ai.com,https://www.sellr-ai.com,https://sellr-web.vercel.app
RESEND_API_KEY
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
EMAIL_OTP_TTL_SECONDS=600
EMAIL_OTP_ALLOWED_DOMAINS=wisc.edu
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
CLOUDFLARE_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
CLOUDFLARE_CDN_URL=https://cdn.sellr-ai.com
```

Recommended Railway API:

```text
EMAIL_OTP_SECRET=<long-random-secret>
```

Vercel web:

```text
INTERNAL_API_URL=https://api.sellr-ai.com
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api.sellr-ai.com
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr-ai.com
NEXT_PUBLIC_SITE_URL=https://sellr-ai.com
```

Vercel dashboard-side Web Analytics and Speed Insights should also be enabled
for the web project so data appears after the mounted components send events.

## Production Smoke Baseline

Use real Resend email OTP in production. Local `000000` email/SMS OTP is
intentionally disabled in production. Twilio SMS is available only for the phone
fallback path when Twilio variables are configured.

1. Open `https://sellr-ai.com`.
2. Sign in with a real `@wisc.edu` email address.
3. Join or confirm community access.
4. Browse `/marketplace`.
5. Open a listing detail page.
6. Contact the seller.
7. Confirm the inbox thread exists.
8. Confirm notifications update.
9. Create a listing with an uploaded image and verify the image URL is R2/CDN.
10. Edit/publish/unpublish/mark sold from seller inventory.
11. Replace a listing image and confirm no Railway/R2 cleanup errors.
12. Delete a test listing and confirm associated media cleanup is queued/deleted.
13. Open a seller storefront.
14. Use `/admin/community` to create an invite and manage member role/status.
15. Use `/admin/reports` with an admin user, including explicit listing removal
    for a listing report.

## Local Verification Baseline

Use:

```bash
pnpm slc:ready
```

That command seeds demo data, runs seller/buyer/web smoke checks, then runs
focused package checks for shared contracts, API, and web.

Local demo data:

```text
Community invite: DEV2026
Local student email domain: wisc.edu
Seller: +15550000001 / Maya Chen
Buyer: +15550000002 / Jordan Rivera
Admin: +15550000003 / Priya Shah
Local email/SMS OTP: 000000
```

For API integration tests, use a dedicated local Supabase test DB and set:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/sellr_integration_test
TEST_DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/sellr_integration_test
```

With that configured, the focused API integration command currently runs the
full local API suite: 9 files / 71 tests. Without it, local DB integration
suites are skipped by the repo safety guard.

## Files To Read First

- `AGENTS.md`
- `README.md`
- `docs/current-state-and-scope.md`
- `docs/deployment.md`
- `docs/custom-domain-cutover.md`
- `docs/email-first-auth.md`
- `docs/slc-readiness.md`
- `docs/slc-smoke-test.md`
- `docs/ui-ux-overhaul-guide.md`
- `docs/design-language.md`
- `apps/web/README.md`
- `sellr-technical-implementation-guide-v2.md`

## Follow-Up Engineering Risks

- Media cleanup health tooling is now implemented through API scripts:
  `media:health`, `media:cleanup-expired`, and `media:retry-failed`.
- Production runbook coverage lives in `docs/production-runbook.md`.
- Email-first auth setup and launch community gating lives in
  `docs/email-first-auth.md`.
- Domain cutover setup for Cloudflare, Vercel, Railway, Resend, and R2 lives in
  `docs/custom-domain-cutover.md`.
- Structured Railway/Sentry failure visibility now covers Twilio Verify
  failures, R2 upload/delete failures, media cleanup job failures, refresh-token
  failures, and API 500s by route.
- Production alerting thresholds/destinations for the structured failures and
  media health signals are useful post-launch hardening, but are not a release
  blocker for the SLC.
- Watch Railway, Resend, inventory readiness, and media health during the first
  real-user wave.
- Seed enough high-quality active listings for the initial UW-Madison launch;
  use `pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market"`
  as the operational checklist.
- Add real landing-page proof, testimonials, statistics, and approved
  campus/member/listing imagery only after those assets are available and
  approved.
- Consider converting the API to a true ESM production build later, replacing
  the current `tsx src/index.ts` production start workaround.

## Suggested Next Request

If staying in launch mode, ask the next session to help with launch operations:

```text
Read AGENTS.md, docs/current-state-and-scope.md, and docs/next-session-context.md.
Help operate the initial Sellr campus launch: seed or review launch listings,
verify admin/community access, run media health checks, watch Railway/Resend
logs, and record any launch notes. Do not add new product scope.
```

If continuing product development, use this prompt only for regression-driven
follow-up or optional launch evidence. Do not restart completed Phase C, D, E,
or F work:

```text
Continue Sellr Pre-Phase-6 UI/UX follow-up only if a new regression, optional
launch-evidence need, or asset-dependent follow-up is identified. Read AGENTS.md,
docs/ui-ux-overhaul-guide.md, docs/design-language.md,
docs/current-state-and-scope.md, docs/web-next-development-guide.md,
apps/web/README.md, and apps/web/app/globals.css. Do not restart Phase C, D, E,
or F route redesigns unless a fresh audit finds a concrete regression. Fix only
small regressions, update docs with the exact current state, preserve current SLC
behavior, do not implement Phase 6 AI, do not add broad product scope, and do
not add a new design-system library.
```
