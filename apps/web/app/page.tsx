import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingAppPreview } from '@/components/landing-app-preview';

const proofItems = [
  {
    value: 'wisc.edu',
    label: 'verified access',
    detail: 'Join Badger Market with student email before browsing or selling.',
    icon: 'community',
  },
  {
    value: 'Listings first',
    label: 'marketplace scan',
    detail: 'See photos, price, condition, pickup area, and seller context fast.',
    icon: 'verified',
  },
  {
    value: 'Item inbox',
    label: 'anchored messages',
    detail: 'Conversations stay tied to the listing and the verified community.',
    icon: 'photos',
  },
  {
    value: 'Safer pickup',
    label: 'privacy-minded',
    detail: 'Start with approximate area and share exact details only in conversation.',
    icon: 'messages',
  },
] as const;

const flowSteps = [
  {
    n: '01',
    title: 'Verify access',
    copy: 'Use your UW email or a trusted invite code to open Badger Market.',
    visual: 'wisc.edu verified',
  },
  {
    n: '02',
    title: 'Browse or list',
    copy: 'Compare useful campus items, or post your own with photos and pickup context.',
    visual: '$140 desk / Lakeshore',
  },
  {
    n: '03',
    title: 'Message from the item',
    copy: 'Start the conversation from the listing so seller, item, and community stay attached.',
    visual: 'Maya -> walnut desk',
  },
] as const;

const faqs = [
  {
    question: 'Who can join Badger Market?',
    answer:
      'UW-Madison students can join with a verified wisc.edu email. Invite codes remain available for trusted early users and seed sellers.',
  },
  {
    question: 'Is Sellr charging buyers or sellers?',
    answer:
      'No. Launch access is free while Sellr focuses on community trust, listing quality, and the buyer/seller loop.',
  },
  {
    question: 'How is Sellr different from a listing board?',
    answer:
      'Sellr scopes browse, listing creation, seller identity, contact, inbox replies, and reports to verified communities.',
  },
  {
    question: 'Do listings expose exact pickup addresses?',
    answer:
      'No. Listings should use approximate pickup area and availability first. Exact details belong in the conversation only when both sides are ready.',
  },
  {
    question: 'Will there be student testimonials?',
    answer:
      'Yes. Sellr will add real student, buyer, and seller stories after launch usage creates specific results worth sharing.',
  },
] as const;

export default function Home() {
  return (
    <main className="bg-[linear-gradient(180deg,#fff9d7_0%,#ffffff_34%,#f7f4ea_76%,#111111_100%)] text-[var(--text-primary)]">
      <Header />
      <Hero />
      <CommunityProof />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-black/10 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#fff9d7_32%,#f7f4ea_72%)]"
    >
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex max-w-full items-center gap-3 rounded-full border border-black/10 bg-white px-3 py-2 shadow-sm">
            <Image
              src="/brand/sellr-symbol.png"
              alt=""
              width={32}
              height={32}
              priority
              className="h-8 w-8 shrink-0 rounded-full object-contain"
            />
            <p className="truncate text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
              Launching with Badger Market
            </p>
          </div>

          <h1
            id="hero-heading"
            className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] text-black sm:text-6xl"
          >
            Badger Market
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Sellr&apos;s verified UW-Madison marketplace for buying, selling, and
            messaging around local items before pickup details get personal.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[var(--color-brand-contrast-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] sm:text-base"
            >
              Join Badger Market
              <ArrowRightIcon />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--text-primary)] no-underline transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              See how it works
            </Link>
          </div>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              wisc.edu verified
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              Community-scoped listings
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              Item-linked messages
            </span>
          </div>
        </div>

        <div id="preview" className="mt-9 scroll-mt-24 sm:mt-12">
          <LandingAppPreview />
        </div>
      </div>
    </section>
  );
}

function CommunityProof() {
  return (
    <section
      id="proof"
      aria-labelledby="proof-heading"
      className="border-b border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf0_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
              After joining
            </p>
            <h2
              id="proof-heading"
              className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl"
            >
              Join once, then get straight to the marketplace.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Badger Market keeps access, listings, seller context, and messages
            inside the same verified community.
          </p>
        </div>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proofItems.map((item) => (
            <div
              key={item.value}
              className="rounded-2xl border border-black/10 bg-white p-4"
            >
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#f6e84c] text-black">
                <ProofIcon type={item.icon} />
              </span>
              <dt className="text-xl font-semibold leading-tight text-black">
                {item.value}
              </dt>
              <dd className="mt-2 text-sm font-semibold text-[var(--color-brand-contrast)]">
                {item.label}
              </dd>
              <dd className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {item.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-b border-black/10 bg-[linear-gradient(180deg,#f7f4ea_0%,#fff9d7_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Three moves from access to pickup intent.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <ol className="divide-y divide-black/10">
              {flowSteps.map((step) => (
                <li
                  key={step.n}
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_1fr]"
                >
                  <span className="text-sm font-semibold text-[var(--color-brand-contrast)]">
                    {step.n}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-primary-strong)]">
                        {step.visual}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {step.copy}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
              App preview
            </p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight">
              The flow stays tied to the item.
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Listing details, seller context, and messages stay connected from
              browse to pickup, so buyers and sellers do not have to rebuild
              trust in a separate thread.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-[#f7f4ea]">
              <div className="grid grid-cols-3 border-b border-black/10 text-xs font-semibold">
                <span className="bg-[#f6e84c] px-3 py-2">Verify</span>
                <span className="px-3 py-2">List</span>
                <span className="px-3 py-2">Meet</span>
              </div>
              <div className="p-4">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm font-semibold">Walnut writing desk</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    $140 / Lakeshore / Maya R.
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold">
                  <div className="rounded-xl bg-white p-3">
                    Verified community
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    Item-linked inbox
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-black/10 bg-[linear-gradient(180deg,#f7f4ea_0%,#ffffff_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Clear answers before joining.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                {faq.question}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6e84c] text-black transition group-open:rotate-45">
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

function FinalCta() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-[radial-gradient(circle_at_70%_0%,#34295f_0%,#111111_42%,#050505_100%)] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-[#f6e84c]">
              Ready to join
            </p>
            <h2
              id="cta-heading"
              className="mt-4 text-5xl font-semibold leading-none sm:text-6xl"
            >
              Join before the handoff.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              Verify your community, browse local listings, and start
              conversations with people who share the same campus context.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f6e84c] px-6 py-3.5 text-base font-semibold text-black no-underline shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Join Badger Market
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#111111] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/sellr-logo-light-reversed.png"
            alt=""
            width={128}
            height={40}
            className="h-9 w-auto object-contain"
          />
          <p className="max-w-xs text-xs leading-5 text-white/60">
            Trust-native local marketplace for verified communities.
          </p>
        </div>

        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
          aria-label="Footer"
        >
          <Link
            href="#preview"
            className="text-white/65 no-underline hover:text-white"
          >
            Preview
          </Link>
          <Link
            href="#how-it-works"
            className="text-white/65 no-underline hover:text-white"
          >
            How it works
          </Link>
          <Link
            href="#faq"
            className="text-white/65 no-underline hover:text-white"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="font-semibold text-[#f6e84c] no-underline hover:text-white"
          >
            Sign in
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Sellr. Built for local trust.</p>
          <p>Sellr is in early access. Joining is community-only.</p>
        </div>
      </div>
    </footer>
  );
}

function ProofIcon({
  type,
}: {
  type: (typeof proofItems)[number]['icon'];
}) {
  if (type === 'community') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M2 21v-2a4 4 0 0 1 3-3.87" />
      </svg>
    );
  }

  if (type === 'verified') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (type === 'photos') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 15-4.5-4.5L9 18" />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
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
  );
}
