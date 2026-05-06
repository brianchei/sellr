import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <main className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <Header />
      <Hero />
      <SectionRule />
      <WhySellr />
      <HowItWorks />
      <ForSellers />
      <ForBuyers />
      <TrustByDesign />
      <FinalCta />
      <Footer />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section
      id="hero"
      className="hero-grid-bg relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="animate-fade-in-up flex max-w-2xl flex-col justify-center">
          <span className="eyebrow">For verified local communities</span>
          <h1
            id="hero-heading"
            className="text-display-serif mt-5 text-[var(--text-primary)]"
          >
            Local resale that doesn&rsquo;t feel like a stranger handoff.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Sellr keeps every listing, message, and pickup inside a community
            you&rsquo;ve already joined. The person on the other side has a
            name, a profile, and a real reason to show up.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:-translate-y-px hover:bg-[var(--color-brand-primary-hover)] hover:shadow-md sm:text-base"
            >
              Join your community
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3.5 text-sm font-medium text-[var(--color-brand-contrast)] no-underline transition hover:bg-[var(--color-brand-contrast-soft)] sm:text-base"
            >
              See how it works
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </Link>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--color-brand-contrast-muted)] pt-6 text-sm">
            {[
              {
                label: 'Verified',
                value: 'Communities',
                tone: 'accent' as const,
              },
              {
                label: 'Item-anchored',
                value: 'Messaging',
                tone: 'contrast' as const,
              },
              {
                label: 'Approximate',
                value: 'Pickup',
                tone: 'primary' as const,
              },
            ].map((item) => (
              <div key={item.value} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  {item.label}
                </dt>
                <dd
                  className="mt-1 truncate font-semibold"
                  style={{
                    color:
                      item.tone === 'accent'
                        ? 'var(--color-brand-accent-strong)'
                        : item.tone === 'contrast'
                          ? 'var(--color-brand-contrast)'
                          : 'var(--color-brand-primary-strong)',
                  }}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-fade-in-up relative flex items-center justify-center lg:justify-end">
          <HeroListingPreview />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero Listing Preview                                                        */
/* (Visually mirrors ListingCard but is non-clickable and clearly a sample)    */
/* -------------------------------------------------------------------------- */

function HeroListingPreview() {
  return (
    <div className="relative w-full max-w-md">
      <span className="absolute -top-3 left-4 z-10 rounded-full border border-[var(--border-default)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)] shadow-sm">
        Sample preview
      </span>

      <article
        className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white"
        style={{ boxShadow: 'var(--shadow-lift)' }}
        aria-label="Sample Sellr listing preview"
      >
        <div
          className="relative flex h-56 items-end overflow-hidden sm:h-64"
          style={{
            background:
              'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, var(--color-brand-accent-soft) 55%, var(--color-brand-contrast-soft) 100%)',
          }}
        >
          <SamplePhotoArt />
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--color-brand-contrast)] shadow-sm">
              Furniture
            </span>
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
              Desk
            </span>
          </div>
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-accent-strong)] shadow-sm">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  fill="currentColor"
                  opacity="0.18"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Verified seller
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-semibold leading-6 text-[var(--text-primary)]">
                Walnut writing desk, solid wood
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                North Campus &middot; pickup window Sat 10&ndash;14
              </p>
            </div>
            <p className="shrink-0 text-base font-semibold text-[var(--text-primary)]">
              $140
            </p>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            Clean lines, barely a scratch. Owned for two years, moving out and
            looking for a quick local pickup.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
              Like new
            </span>
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
              Open to offers
            </span>
            <span className="rounded-full bg-[var(--color-brand-contrast-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-contrast)]">
              3 active listings
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-sm font-bold text-[var(--text-primary)]"
              aria-hidden="true"
            >
              MR
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                Maya R.
              </p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                Member since Jan 2026 &middot; same community
              </p>
            </div>
            <span className="chip-soft">
              <span className="chip-dot" />
              Online today
            </span>
          </div>
        </div>
      </article>

      <div
        className="pointer-events-none absolute -bottom-4 -right-4 -z-10 hidden h-40 w-40 rounded-3xl sm:block"
        style={{
          background:
            'radial-gradient(circle, var(--color-brand-accent-soft) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

function SamplePhotoArt() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#topGlow)" />
      <g
        stroke="var(--color-brand-contrast)"
        strokeOpacity="0.35"
        strokeWidth="2"
        fill="none"
      >
        <rect x="80" y="120" width="240" height="14" rx="3" />
        <line x1="110" y1="134" x2="110" y2="200" />
        <line x1="290" y1="134" x2="290" y2="200" />
        <line x1="100" y1="200" x2="300" y2="200" strokeWidth="2.5" />
        <rect
          x="160"
          y="78"
          width="80"
          height="42"
          rx="2"
          fill="var(--color-brand-primary)"
          fillOpacity="0.55"
        />
      </g>
      <circle
        cx="340"
        cy="60"
        r="22"
        fill="var(--color-brand-primary)"
        opacity="0.45"
      />
      <circle
        cx="56"
        cy="180"
        r="14"
        fill="var(--color-brand-accent)"
        opacity="0.45"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Why Sellr (3 painkiller cards)                                              */
/* -------------------------------------------------------------------------- */

function WhySellr() {
  const cards = [
    {
      icon: <IconShield />,
      tone: 'accent' as const,
      title: 'Verified communities only',
      copy: 'Sellr opens up after you join a verified community — campus, building, workplace, or invite-only group. Everyone you message belongs to the same local circle.',
    },
    {
      icon: <IconAnchorMessage />,
      tone: 'contrast' as const,
      title: 'Item-anchored conversations',
      copy: 'Conversations always start from a specific listing. Buyers and sellers know exactly which item, which price, and which pickup is being coordinated.',
    },
    {
      icon: <IconHandoff />,
      tone: 'primary' as const,
      title: 'Safer local handoffs',
      copy: 'Listings expose neighborhood and pickup windows — never a precise address until both sides agree. Built-in reporting keeps moderators in the loop.',
    },
  ];

  return (
    <section
      id="why"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
      aria-labelledby="why-heading"
    >
      <div className="max-w-2xl">
        <span className="eyebrow">Why Sellr feels different</span>
        <h2
          id="why-heading"
          className="text-section-serif mt-4 text-[var(--text-primary)]"
        >
          Built for the part of resale that actually goes wrong.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
          Generic marketplaces optimize for listings. Sellr optimizes for what
          happens after the listing — the messaging, the trust, and the local
          handoff. That&rsquo;s where flakes, scams, and awkward logistics
          usually win.
        </p>
      </div>

      <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="animate-fade-in-up surface-marketing flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:p-7"
          >
            <span
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background:
                  card.tone === 'accent'
                    ? 'var(--color-brand-accent-soft)'
                    : card.tone === 'contrast'
                      ? 'var(--color-brand-contrast-soft)'
                      : 'var(--color-brand-primary-soft)',
                color:
                  card.tone === 'accent'
                    ? 'var(--color-brand-accent-strong)'
                    : card.tone === 'contrast'
                      ? 'var(--color-brand-contrast)'
                      : 'var(--color-brand-primary-strong)',
              }}
              aria-hidden="true"
            >
              {card.icon}
            </span>
            <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              {card.copy}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* How it works                                                                */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Join a verified community',
      copy: 'Use an invite code, a community email, or join through a partner group. Sellr only unlocks once your local circle is confirmed.',
    },
    {
      n: '02',
      title: 'List with structure or browse with intent',
      copy: 'Sellers post clear price, photos, condition, and pickup window. Buyers browse listings scoped to their community — no global noise.',
    },
    {
      n: '03',
      title: 'Message about a specific item',
      copy: 'Every conversation is anchored to a listing, with both sides\u2019 identity already verified inside the community.',
    },
    {
      n: '04',
      title: 'Coordinate a safe local pickup',
      copy: 'Trade neighborhood and pickup window first. Share a precise spot only after both sides commit. Report anything off in one tap.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="border-y border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)]/40"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-md">
            <span className="eyebrow">How it works</span>
            <h2
              id="how-heading"
              className="text-section-serif mt-4 text-[var(--text-primary)]"
            >
              Four steps, every one designed around trust.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
              No anonymous handoffs. No mystery buyers. No sketchy parking-lot
              drop-offs. Just structured listings, verified members, and a flow
              that respects how local resale actually works.
            </p>
          </div>

          <ol className="space-y-3 sm:space-y-4">
            {steps.map((step) => (
              <li
                key={step.n}
                className="surface-marketing flex gap-5 p-5 sm:p-6"
              >
                <div className="flex flex-col items-center">
                  <span
                    className="font-display-serif flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-lg text-[var(--text-primary)]"
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[0.95rem]">
                    {step.copy}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* For sellers (slightly heavier weight)                                       */
/* -------------------------------------------------------------------------- */

function ForSellers() {
  const benefits = [
    {
      title: 'Buyers who already belong here',
      copy: 'Every message comes from a verified community member, not a throwaway DM account. Less ghosting, less spam, more real intent.',
    },
    {
      title: 'Structured listings buyers actually trust',
      copy: 'Price, photos, condition, pickup window, and approximate area are required by the listing form. Obvious questions are answered before anyone messages you.',
    },
    {
      title: 'Less back-and-forth, fewer flakes',
      copy: 'Item-anchored conversations and approximate pickup areas keep coordination tight. Mark sold, hide expired, or pause inventory without losing buyer history.',
    },
  ];

  return (
    <section
      id="sellers"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
      aria-labelledby="sellers-heading"
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="eyebrow">For sellers</span>
          <h2
            id="sellers-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            Listings that actually move.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            Sellr is built for the seller side first. Most local resale fails
            because sellers waste hours on tire-kickers, repeat the same
            answers, and watch buyers vanish before pickup. Sellr removes that
            entire layer.
          </p>

          <ul className="mt-8 space-y-4">
            {benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="surface-marketing flex gap-4 p-5"
              >
                <span
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
                  aria-hidden="true"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {benefit.copy}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:-translate-y-px hover:bg-[var(--color-brand-primary-hover)]"
            >
              Start selling locally
            </Link>
            <Link
              href="#trust"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-white px-5 py-3 text-sm font-medium text-[var(--color-brand-contrast)] no-underline transition hover:bg-[var(--bg-secondary)]"
            >
              See trust controls
            </Link>
          </div>
        </div>

        <div className="surface-marketing-soft p-7 sm:p-9">
          <span className="eyebrow text-[var(--color-brand-contrast-strong)]">
            Seller workflow
          </span>
          <h3 className="font-display-serif mt-4 text-2xl text-[var(--text-primary)] sm:text-3xl">
            One listing. Clear next step. Every time.
          </h3>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              {
                label: 'Draft → published',
                detail:
                  'Structured form catches missing photos, price, or pickup window before the listing goes live.',
              },
              {
                label: 'Buyer messages → inbox',
                detail:
                  'Every inbound is tied to a specific listing card so context never gets lost.',
              },
              {
                label: 'Coordinate → mark sold',
                detail:
                  'One tap removes the listing from browse and ends the lifecycle cleanly.',
              },
            ].map((row) => (
              <li
                key={row.label}
                className="rounded-xl border border-[var(--border-default)] bg-white p-4"
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {row.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {row.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* For buyers                                                                  */
/* -------------------------------------------------------------------------- */

function ForBuyers() {
  const points = [
    'Browse only inside communities you have already joined.',
    'See seller identity, member-since, and active listings before you message.',
    'Approximate pickup areas keep your home address private until you commit.',
    'Report anything off — a real moderator looks at it, not a black box.',
  ];

  return (
    <section
      className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24"
      aria-labelledby="buyers-heading"
    >
      <div className="grid gap-8 rounded-2xl border border-[var(--border-default)] bg-white p-7 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
        <div>
          <span className="eyebrow">For buyers</span>
          <h2
            id="buyers-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            And buyers who don&rsquo;t want to deal with strangers from
            nowhere.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            You shouldn&rsquo;t have to vet a stranger every time you want a
            used desk. Sellr already did the vetting — your community did.
          </p>
        </div>

        <ul className="space-y-3">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)]/50 p-4"
            >
              <span
                className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-contrast)] text-white"
                aria-hidden="true"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
              </span>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                {point}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Trust by design                                                             */
/* -------------------------------------------------------------------------- */

function TrustByDesign() {
  const pillars = [
    {
      title: 'Verified communities only',
      copy: 'Invite codes, community emails, or partner groups. No global signups.',
      icon: <IconShield />,
    },
    {
      title: 'Identity-aware contact',
      copy: 'Every message carries a verified member profile and member-since context.',
      icon: <IconIdentity />,
    },
    {
      title: 'Approximate pickup',
      copy: 'Neighborhood and pickup window only. No precise addresses until both sides agree.',
      icon: <IconLocation />,
    },
    {
      title: 'Item-anchored conversations',
      copy: 'Threads stay tied to a specific listing — no orphaned DMs, no context loss.',
      icon: <IconAnchorMessage />,
    },
    {
      title: 'In-app reporting',
      copy: 'One tap on any listing, member, or message. Real human moderators review it.',
      icon: <IconFlag />,
    },
    {
      title: 'Lifecycle that ends cleanly',
      copy: 'Mark sold, expire, or pause without losing buyer history or breaking links.',
      icon: <IconCheckCircle />,
    },
  ];

  return (
    <section
      id="trust"
      className="border-t border-[var(--color-brand-contrast-muted)] bg-[var(--bg-elevated)]"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <span className="eyebrow">Trust, by design</span>
          <h2
            id="trust-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            Six concrete things, baked into the product.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            Trust isn&rsquo;t a marketing word. These are the actual mechanics
            Sellr uses on every listing, every message, every pickup.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="surface-marketing flex gap-4 p-5 sm:p-6"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
                aria-hidden="true"
              >
                {pillar.icon}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {pillar.copy}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                   */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
      aria-labelledby="cta-heading"
    >
      <div
        className="relative overflow-hidden rounded-3xl border border-[var(--color-brand-primary-muted)] p-8 sm:p-12"
        style={{
          background:
            'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, var(--bg-elevated) 60%, var(--color-brand-accent-soft) 100%)',
        }}
      >
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">Ready when you are</span>
            <h2
              id="cta-heading"
              className="text-section-serif mt-4 text-[var(--text-primary)]"
            >
              Local resale, with people you can actually verify.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
              Phone sign-in takes a minute. Joining your community takes
              another. Then you&rsquo;re in — listings, messages, and pickup
              coordination, all scoped to people who already belong.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-primary)] px-6 py-3.5 text-base font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:-translate-y-px hover:bg-[var(--color-brand-primary-hover)] hover:shadow-md"
            >
              Join your community
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-6 py-3.5 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm transition hover:bg-[var(--bg-secondary)]"
            >
              Already a member? Sign in
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, var(--color-brand-primary) 0%, transparent 65%)',
          }}
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/sellr-logo-mark.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-contain"
          />
          <div>
            <p className="text-base font-bold text-[var(--text-primary)]">
              Sellr
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Trust-native local marketplace for verified communities.
            </p>
          </div>
        </div>

        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
          aria-label="Footer"
        >
          <Link
            href="#why"
            className="text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]"
          >
            Why Sellr
          </Link>
          <Link
            href="#how-it-works"
            className="text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]"
          >
            How it works
          </Link>
          <Link
            href="#sellers"
            className="text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]"
          >
            For sellers
          </Link>
          <Link
            href="#trust"
            className="text-[var(--text-secondary)] no-underline hover:text-[var(--text-primary)]"
          >
            Trust &amp; safety
          </Link>
          <Link
            href="/login"
            className="font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
          >
            Sign in
          </Link>
        </nav>
      </div>

      <div className="border-t border-[var(--border-default)] px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-[var(--text-tertiary)] sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Sellr. Built for local trust.</p>
          <p>Sellr is in early access. Joining is community-only.</p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Section rule                                                                */
/* -------------------------------------------------------------------------- */

function SectionRule() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="section-rule" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inline icons (no icon-library dependency)                                   */
/* -------------------------------------------------------------------------- */

function IconShield() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconAnchorMessage() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="14" height="11" rx="2" />
      <path d="M21 21V8" />
      <path d="M21 8a4 4 0 0 0-4-4" />
      <path d="m17 21 4-4-4-4" />
    </svg>
  );
}

function IconHandoff() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 13c2-3 5-5 9-5s7 2 9 5" />
      <path d="M7 16c1-1.5 3-2.5 5-2.5s4 1 5 2.5" />
      <circle cx="12" cy="20" r="1.5" />
    </svg>
  );
}

function IconIdentity() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11.5" r="2.5" />
      <path d="M5 17c0-2 2-3.5 4-3.5s4 1.5 4 3.5" />
      <path d="M15 10h4" />
      <path d="M15 13.5h3" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9.5" />
    </svg>
  );
}
