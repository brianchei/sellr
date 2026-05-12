import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/header';

export default function Home() {
  return (
    <main className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <Header />
      <Hero />
      <CommunityProof />
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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 pt-8 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="animate-fade-in-up flex max-w-2xl flex-col justify-center">
          <div className="mb-5 inline-flex max-w-full items-center gap-3 rounded-2xl border border-[var(--color-brand-primary-muted)] bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <Image
              src="/brand/sellr-symbol.png"
              alt=""
              width={34}
              height={34}
              priority
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                Sellr for campus communities
              </p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                Launching with Badger Market
              </p>
            </div>
          </div>
          <span className="eyebrow">Verified local resale</span>
          <h1
            id="hero-heading"
            className="text-display-serif mt-5 text-[var(--text-primary)]"
          >
            Campus resale, without stranger handoffs.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            Sellr keeps listings, messages, and pickup coordination inside
            verified communities. Badger Market starts with UW-Madison, where
            buyers and sellers share local context before they ever meet.
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
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--color-brand-contrast-muted)] pt-6 text-sm">
            {[
              {
                label: 'Launch',
                value: 'UW-Madison',
                tone: 'accent' as const,
              },
              {
                label: 'Access',
                value: 'wisc.edu',
                tone: 'contrast' as const,
              },
              {
                label: 'Local',
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
    <div className="relative w-full max-w-sm sm:max-w-md">
      <span className="absolute -top-3 left-4 z-10 rounded-full border border-[var(--border-default)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)] shadow-sm">
        Badger Market preview
      </span>

      <article
        className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white"
        style={{ boxShadow: 'var(--shadow-lift)' }}
        aria-label="Sample Sellr listing preview"
      >
        <div
          className="relative flex h-48 items-end overflow-hidden sm:h-64"
          style={{
            background:
              'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, var(--color-brand-accent-soft) 55%, var(--color-brand-contrast-soft) 100%)',
          }}
        >
          <SamplePhotoArt />
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--color-brand-contrast)] shadow-sm">
              Campus pickup
            </span>
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
              Verified UW
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
                Lakeshore &middot; pickup window Sat 10&ndash;2
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
                Badger Market member &middot; same community
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
/* Community proof                                                             */
/* -------------------------------------------------------------------------- */

function CommunityProof() {
  const proof = [
    {
      value: 'Badger Market',
      label: 'first decorated launch community',
      detail: 'Built around verified UW-Madison access, not anonymous browsing.',
    },
    {
      value: 'wisc.edu',
      label: 'student email gate',
      detail: 'Campus members can join with their verified school account.',
    },
    {
      value: 'R2 media',
      label: 'durable listing photos',
      detail: 'Uploaded listing images stay available after deploys and reloads.',
    },
    {
      value: 'Inbox + reports',
      label: 'core trust loop live',
      detail: 'Buyer contact, replies, notifications, and reporting are already in the product.',
    },
  ];

  return (
    <section
      className="border-y border-[var(--border-default)] bg-white"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Community proof</span>
            <h2
              id="proof-heading"
              className="mt-3 text-xl font-semibold text-[var(--text-primary)] sm:text-2xl"
            >
              Launching with real community mechanics.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            No inflated user claims before launch. These are the trust pieces
            already built into the Sellr web SLC.
          </p>
        </div>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proof.map((item) => (
            <div
              key={item.value}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
            >
              <dt className="text-sm font-semibold text-[var(--color-brand-contrast)]">
                {item.value}
              </dt>
              <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {item.label}
              </dd>
              <dd className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {item.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Problem / pain                                                              */
/* -------------------------------------------------------------------------- */

function WhySellr() {
  const cards = [
    {
      icon: <IconShield />,
      tone: 'accent' as const,
      title: 'The person is unknown',
      copy: 'Most resale apps make you judge trust from a profile picture, a vague name, and a few rushed messages.',
    },
    {
      icon: <IconAnchorMessage />,
      tone: 'contrast' as const,
      title: 'The handoff is awkward',
      copy: 'Buyers and sellers negotiate around schedules, pickup spots, and expectations without shared local context.',
    },
    {
      icon: <IconHandoff />,
      tone: 'primary' as const,
      title: 'The thread loses context',
      copy: 'Once the conversation drifts, it gets harder to remember the item, price, timing, and who should do what next.',
    },
  ];

  return (
    <section
      id="why"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
      aria-labelledby="why-heading"
    >
      <div className="max-w-2xl">
        <span className="eyebrow">The pain</span>
        <h2
          id="why-heading"
          className="text-section-serif mt-4 text-[var(--text-primary)]"
        >
          Local resale breaks after the listing.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
          The hard part is not posting a desk or finding a lamp. It is knowing
          who you are meeting, what community they belong to, and whether the
          pickup will actually happen.
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
      title: 'Verify community access',
      copy: 'UW-Madison students use a verified wisc.edu email. Invited users can join with a community code.',
      visual: 'wisc.edu -> Badger Market',
    },
    {
      n: '02',
      title: 'Browse or post with structure',
      copy: 'Listings show photos, price, condition, pickup area, and availability before anyone starts a thread.',
      visual: 'Desk • $140 • Lakeshore',
    },
    {
      n: '03',
      title: 'Message about a specific item',
      copy: 'The thread stays tied to the item, seller, and price so coordination does not drift into a mystery DM.',
      visual: 'Buyer -> listing thread',
    },
    {
      n: '04',
      title: 'Coordinate pickup locally',
      copy: 'Start with approximate area and pickup window. Keep exact details private until both sides are ready.',
      visual: 'Lakeshore • Sat 10-2',
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
              A product flow you can understand in seconds.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
              This first version uses static product-flow cards. A short demo
              GIF or video can replace this once the launch flow is recorded.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <li
                key={step.n}
                className="surface-marketing flex flex-col gap-5 p-5 sm:p-6"
              >
                <div className="rounded-2xl border border-[var(--color-brand-contrast-muted)] bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                    Product view
                  </p>
                  <div className="mt-3 rounded-xl bg-[var(--color-brand-primary-soft)] p-4">
                    <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {step.visual}
                    </p>
                    <div className="mt-3 h-2 w-full rounded-full bg-white" />
                    <div className="mt-2 h-2 w-2/3 rounded-full bg-white" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <span
                    className="font-display-serif flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-lg text-[var(--text-primary)]"
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[0.95rem]">
                      {step.copy}
                    </p>
                  </div>
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
      title: 'Meet people with shared context',
      copy: 'Every listing and message sits inside a verified community, so buyers and sellers start with a local connection.',
    },
    {
      title: 'Post listings buyers can act on',
      copy: 'Photos, condition, price, pickup area, and availability help buyers decide faster and message with clearer intent.',
    },
    {
      title: 'Keep coordination attached to the item',
      copy: 'Conversations start from a listing, so the price, seller, pickup context, and message thread stay together.',
    },
    {
      title: 'Give communities moderation tools',
      copy: 'Reporting and admin review keep problematic listings, messages, and members visible to the people responsible for the community.',
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
          <span className="eyebrow">Features as benefits</span>
          <h2
            id="sellers-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            Built around outcomes, not inventory dumps.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            The goal is not more listings for the sake of more listings. The
            goal is cleaner intent, safer coordination, and a marketplace that
            feels grounded in the community using it.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
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
  const commitments = [
    {
      title: 'No fake launch testimonials',
      copy: 'Until real quotes exist, Sellr will show concrete product commitments instead of invented praise.',
    },
    {
      title: 'Community membership comes first',
      copy: 'The marketplace opens after verified email or invite-code access, so the browsing context is local from the start.',
    },
    {
      title: 'Trust claims stay grounded',
      copy: 'Sellr shows what it can actually verify: community access, profile identity, listing context, and reportable activity.',
    },
  ];

  return (
    <section
      className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24"
      aria-labelledby="buyers-heading"
    >
      <div className="grid gap-8 rounded-2xl border border-[var(--border-default)] bg-white p-7 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12">
        <div>
          <span className="eyebrow">Trust commitments</span>
          <h2
            id="buyers-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            Proof should be earned, not fabricated.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            The landing page will move to real student and seller quotes once
            they exist. For launch, the trust section should explain the
            product mechanics users can verify themselves.
          </p>
        </div>

        <ul className="space-y-3">
          {commitments.map((item) => (
            <li
              key={item.title}
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
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.copy}
                </p>
              </div>
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
  const faqs = [
    {
      question: 'Who can join Badger Market?',
      answer:
        'UW-Madison students can join with a verified wisc.edu email. Invite codes remain available for trusted early users and seed sellers.',
    },
    {
      question: 'Is Sellr charging buyers or sellers?',
      answer:
        'No pricing section is shown for launch because Sellr is focused on access, trust, and marketplace quality before paid plans.',
    },
    {
      question: 'How is this different from a generic listing board?',
      answer:
        'Sellr scopes browse, listings, and contact to verified communities, then keeps conversations anchored to specific items.',
    },
    {
      question: 'Do listings show exact pickup addresses?',
      answer:
        'No. Listings use approximate pickup area and availability first. Exact coordination should happen only after both sides are ready.',
    },
    {
      question: 'Why are there no testimonials yet?',
      answer:
        'The launch page avoids fake quotes. Real student, buyer, and seller testimonials can be added after actual usage.',
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
          <span className="eyebrow">FAQ</span>
          <h2
            id="trust-heading"
            className="text-section-serif mt-4 text-[var(--text-primary)]"
          >
            Clear answers before you join.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            These cover the first objections for the launch page: access,
            pricing, safety, and proof.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--text-primary)]">
                {faq.question}
                <span className="text-[var(--color-brand-contrast)] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {faq.answer}
              </p>
            </details>
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
              Join the community before the handoff.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
              Start with Badger Market, verify your access, and browse local
              listings from people who belong to the same campus community.
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
            src="/brand/sellr-logo-full.png"
            alt=""
            width={128}
            height={40}
            className="h-9 w-auto object-contain"
          />
          <p className="max-w-xs text-xs text-[var(--text-secondary)]">
            Trust-native local marketplace for verified communities.
          </p>
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

