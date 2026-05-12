# Sellr Custom Domain Cutover

Use this guide to make `sellr-ai.com` the production-facing Sellr domain while
keeping Vercel, Railway, Resend, and Cloudflare R2 as the underlying services.

Status: completed and production-smoke-tested on May 11, 2026. Keep this guide
for audits, rollback, and future domain/provider changes.

## Domain Map

```text
Web app:     https://sellr-ai.com
Web alias:   https://www.sellr-ai.com -> https://sellr-ai.com
API:         https://api.sellr-ai.com
Media CDN:   https://cdn.sellr-ai.com
Email OTP:   send.sellr-ai.com
```

Provider backing URLs:

```text
Vercel:  https://sellr-web.vercel.app
Railway: https://api-production-be29.up.railway.app
```

Keep the backing URLs for diagnostics and rollback, but do not use them in
public launch links.

## Cloudflare DNS Records

Create records from the provider dashboards first, then add the exact records
those dashboards give you in Cloudflare. Do not guess verification TXT values or
provider-specific CNAME targets.

Recommended initial Cloudflare proxy posture:

- Use **DNS only** for Vercel web records. Vercel discourages putting
  Cloudflare's reverse proxy in front of Vercel.
- For Railway, add the CNAME and TXT records exactly as Railway shows them. If
  you enable Cloudflare proxying, set Cloudflare SSL/TLS mode to **Full** for
  this zone as Railway documents. If you leave the record DNS-only, wait until
  Railway provisions its HTTPS certificate before switching traffic.
- Leave all TXT and email-auth records as DNS-only. TXT records cannot be
  proxied.
- R2 custom-domain records are managed by Cloudflare when you connect the
  bucket domain.

## Vercel Web Domain

In Vercel, open the `sellr-web` project:

1. Go to **Settings -> Domains**.
2. Add `sellr-ai.com`.
3. Add `www.sellr-ai.com`.
4. Set `sellr-ai.com` as the primary domain.
5. Configure `www.sellr-ai.com` to redirect to `sellr-ai.com`.
6. Copy the DNS records Vercel asks for into Cloudflare.

Typical records are:

```text
Type  Name  Value
A     @     <Vercel apex IP shown by Vercel>
CNAME www   <Vercel CNAME target shown by Vercel>
```

Use the exact values from Vercel's domain screen. If Vercel asks for a TXT
verification record, add that as well.

Vercel production variables:

```text
INTERNAL_API_URL=https://api.sellr-ai.com
NEXT_PUBLIC_USE_SAME_ORIGIN_API=1
NEXT_PUBLIC_REALTIME_URL=https://api.sellr-ai.com
NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr-ai.com
NEXT_PUBLIC_SITE_URL=https://sellr-ai.com
```

Do not set `NEXT_PUBLIC_API_URL` for the normal production web flow.

Redeploy Vercel after changing these variables.

## Railway API Domain

In Railway, open the Fastify API service:

1. Go to **Settings -> Networking -> Public Networking**.
2. Add the custom domain `api.sellr-ai.com`.
3. If Railway asks for a target port, use the API service port.
4. Add both records Railway gives you in Cloudflare:
   - the routing CNAME record
   - the TXT ownership verification record
5. Wait for Railway to verify the custom domain and issue HTTPS.

Railway API variables:

```text
ALLOWED_ORIGINS=https://sellr-ai.com,https://www.sellr-ai.com,https://sellr-web.vercel.app
CLOUDFLARE_CDN_URL=https://cdn.sellr-ai.com
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
```

The `sellr-web.vercel.app` origin is optional. Keep it only if you want direct
access to the backing Vercel deployment for diagnostics or rollback.

Redeploy Railway after changing variables.

## Cloudflare R2 Media Domain

In Cloudflare, open the R2 bucket used for listing media:

1. Go to the bucket **Settings** page.
2. Under **Custom Domains**, connect `cdn.sellr-ai.com`.
3. Let Cloudflare create or manage the required DNS record.
4. Wait until the custom domain status is active.
5. Set Railway `CLOUDFLARE_CDN_URL=https://cdn.sellr-ai.com`.
6. Set Vercel `NEXT_PUBLIC_LISTING_IMAGE_CDN_URL=https://cdn.sellr-ai.com`.
7. Redeploy API and web.

After the custom domain works, disable the public `r2.dev` development URL if
it is no longer needed.

## Resend Email Domain

In Resend:

1. Add or confirm the sending domain `send.sellr-ai.com`.
2. Add the SPF, DKIM, and any verification records Resend gives you in
   Cloudflare.
3. Wait for Resend verification to pass.
4. Create a sending API key scoped to `send.sellr-ai.com`.
5. Store the API key in Railway as `RESEND_API_KEY`.

Railway email variables:

```text
RESEND_API_KEY=re_xxx
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
EMAIL_OTP_ALLOWED_DOMAINS=wisc.edu
EMAIL_OTP_TTL_SECONDS=600
EMAIL_OTP_SECRET=<long-random-secret>
```

## Post-Cutover Smoke

Latest status: the post-cutover smoke passed for API health, same-origin web API
proxying, `@wisc.edu` email OTP, `Badger Market` join, `BADGER2026`, listing
image upload to `https://cdn.sellr-ai.com`, listing detail, buyer contact,
inbox, notifications, seller listing lifecycle, and test-listing deletion.

Run these checks after DNS verification and redeploys complete:

```bash
curl https://api.sellr-ai.com/health
curl https://sellr-ai.com/api/v1/auth/me
```

Expected logged-out proxy response:

```json
{ "error": "Unauthorized" }
```

Then use the browser:

1. Open `https://sellr-ai.com`.
2. Confirm `https://www.sellr-ai.com` redirects to `https://sellr-ai.com`.
3. Request email OTP for a real `@wisc.edu` address.
4. Join or confirm `Badger Market` access.
5. Browse marketplace listings.
6. Upload a listing image and confirm the image URL starts with
   `https://cdn.sellr-ai.com`.
7. Contact a seller and confirm inbox/notifications update.
8. Open `/admin/community` and `/admin/reports` as an admin.

## Rollback

If the custom domain has DNS or certificate issues, keep the backing provider
URLs available while you fix DNS:

```text
https://sellr-web.vercel.app
https://api-production-be29.up.railway.app
```

To roll back quickly:

1. Set Vercel `INTERNAL_API_URL` and `NEXT_PUBLIC_REALTIME_URL` back to
   `https://api-production-be29.up.railway.app`.
2. Redeploy Vercel.
3. Keep Railway `ALLOWED_ORIGINS` including the Vercel backing URL.
4. Continue using the backing URLs until custom DNS verifies.
