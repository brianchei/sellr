# Sellr Email-First Auth

This note documents the current email-first launch auth flow. Sellr still uses
custom auth and JWT sessions; Supabase Auth is not used.

## Current Flow

- Web sign-in defaults to a 6-digit email OTP.
- Production email OTP is sent through Resend.
- Local development accepts `000000` for email OTP when Resend is not
  configured and `NODE_ENV` is not `production`.
- Phone OTP through Twilio Verify remains available as a fallback for mobile,
  invited testers, and users who join through an invite code.
- Web sessions use httpOnly cookies through same-origin `/api/v1` rewrites.
- Mobile clients continue to use returned JWTs.

API endpoints:

```text
POST /api/v1/auth/email/send
POST /api/v1/auth/email/verify
POST /api/v1/auth/otp/send
POST /api/v1/auth/otp/verify
```

The email endpoints are intentionally domain-limited. For the initial campus
launch, the allowed domain is `wisc.edu`.

## Data Model

The email-first migration adds email identity fields while preserving existing
phone users:

```text
users.email
users.email_verified_at
users.phone_e164 nullable
```

`users.verified_at` is set when either email OTP or phone OTP succeeds, so
existing trust UI can continue to treat the account as verified.

## Production Variables

Railway API variables:

```text
RESEND_API_KEY=re_xxx
EMAIL_FROM=Sellr <verify@send.sellr-ai.com>
EMAIL_OTP_ALLOWED_DOMAINS=wisc.edu
EMAIL_OTP_TTL_SECONDS=600
EMAIL_OTP_SECRET=<long-random-secret>
```

`EMAIL_OTP_SECRET` is recommended. If it is missing, the API falls back to
`JWT_SECRET` for OTP hashing.

Keep Twilio Verify variables if the phone fallback should remain active:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID
```

## Resend Domain Setup

Use a sending subdomain instead of the root domain:

```text
send.sellr-ai.com
```

In Resend:

1. Add `send.sellr-ai.com` as a domain.
2. Use the Cloudflare automatic setup if available, or add the DNS records
   manually in Cloudflare.
3. Wait until Resend verifies SPF and DKIM.
4. Create a sending-access API key scoped to `send.sellr-ai.com`.
5. Store the API key only in Railway. Do not commit or paste it into chat.

The configured sender is:

```text
Sellr <verify@send.sellr-ai.com>
```

This address does not need a Google Workspace inbox for OTP sending.

## Community Gate

For `email_domain` communities, the requested institutional email must match
the signed-in user's verified email exactly. Users cannot join a domain-gated
community by typing someone else's address.

Initial production launch community:

```text
Name: Badger Market
Type: campus
Access method: email_domain
Email domain: wisc.edu
```

Invite codes remain a secondary path for trusted non-Wisc users, seed sellers,
and testers.

## Smoke Checks

Production:

1. Confirm Railway has the Resend variables above.
2. Confirm the latest Prisma migration has run.
3. Open `/login` on the Vercel web app.
4. Request a code for a real `@wisc.edu` address.
5. Confirm Resend logs show a successful send without exposing the full email
   address in application logs.
6. Verify the code and join `Badger Market` by email domain.

Local:

1. Start Redis, Supabase, API, and web.
2. Open `/login`.
3. Use any `@wisc.edu` address.
4. Enter `000000`.
5. Join `Dev Campus` by email domain, or use `DEV2026` to test the invite-code
   fallback.

Seeded buyer/seller/admin smoke fixtures still use phone numbers so the
existing automated smoke scripts can exercise the established demo listings and
admin surfaces.
