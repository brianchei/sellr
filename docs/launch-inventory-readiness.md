# Sellr Launch Inventory Readiness

Use this checklist before the first real-user wave and after any large seed
inventory update. The goal is not to make every listing perfect; it is to make
Badger Market feel alive, trustworthy, local, and easy to scan.

## Readiness Command

Run from the repository root with production API database environment variables
available:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market"
```

Use strict mode when this should fail the shell command until blocking issues
are fixed:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --strict
```

Machine-readable output:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --json
```

Default launch targets:

- 25 active listings.
- 5 active sellers.
- 5 active categories.
- Listing descriptions of at least 40 characters.
- Listing photos served from `CLOUDFLARE_CDN_URL` when that env var is set.

Useful overrides:

```bash
pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --min-active=40 --min-sellers=8 --min-categories=6
pnpm --filter @sellr/api inventory:readiness -- --cdn-host=cdn.sellr-ai.com
```

## Blocking Launch Issues

Fix these before launch:

- Fewer than the target number of active listings.
- Any active listing without a buyer-visible photo.
- Active listing photos that do not use the production CDN host when the CDN
  host target is configured.
- Missing category, positive price, or pickup area.
- Seller accounts without a verified contact method.
- A missing active community match for the configured launch community.

## Quality Warnings

Treat warnings as a punch list for launch polish:

- Too few active sellers or categories.
- Short listing titles or descriptions.
- Missing condition notes.
- Pickup radius outside the local launch range.
- Placeholder seller names such as `Seed`, `Demo`, or `Test`.
- Missing seller profile photos.
- Listing photo URLs without attached `media_assets` rows.

## Manual Listing Review

For each launch listing, confirm:

- The first photo clearly shows the actual item, not a dark or cropped detail.
- The title uses concrete nouns a buyer would search for.
- The price is realistic for campus resale.
- The condition note names visible wear or confirms working state.
- The pickup area is approximate and privacy-preserving.
- The category mix includes practical campus items, not only furniture.
- The seller profile has a real display name, verified contact, and preferably a
  profile photo.

## Post-Seed Smoke

After inventory is seeded or edited:

1. Run `inventory:readiness`.
2. Run `media:health`.
3. Browse `/marketplace` as a launch community member.
4. Open at least three listing detail pages across different categories.
5. Contact a seller from one active listing and confirm the inbox thread opens.
6. Open the seller storefront for at least one seed seller.
7. Confirm admin can still access `/admin/community` and `/admin/reports`.

Do not add fake testimonials, invented launch proof, or unapproved campus
imagery to compensate for sparse inventory.
