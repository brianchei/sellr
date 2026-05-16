import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/header';
import { LandingAppPreview } from '@/components/landing-app-preview';

const proofItems = [
  {
    value: 'Badger Market',
    label: 'launch community',
    detail: 'A UW-Madison focused first community instead of a generic board.',
    icon: 'community',
  },
  {
    value: 'wisc.edu',
    label: 'verified access',
    detail: 'Students can join with school email before browsing or selling.',
    icon: 'verified',
  },
  {
    value: 'Photo-first',
    label: 'better listing context',
    detail: 'Buyers can judge condition, pickup fit, and seller intent faster.',
    icon: 'photos',
  },
  {
    value: 'Inbox + reports',
    label: 'trust loop live',
    detail: 'Contact, replies, notifications, and reporting are already wired.',
    icon: 'messages',
  },
] as const;

const painItems = [
  {
    title: 'Anonymous profiles make pickup feel risky',
    copy: 'Most resale apps ask buyers and sellers to trust a thin profile, a fuzzy location, and a rushed message thread.',
  },
  {
    title: 'The listing is easy, the handoff is not',
    copy: 'The real work is schedule, pickup area, expectations, and deciding whether the person on the other side will show up.',
  },
  {
    title: 'Conversations lose item context fast',
    copy: 'Once price, timing, and seller identity drift apart, a simple local sale starts to feel like a mystery DM.',
  },
] as const;

const flowSteps = [
  {
    n: '01',
    title: 'Verify the community',
    copy: 'Join Badger Market with a verified UW email or trusted invite code.',
    visual: 'wisc.edu verified',
  },
  {
    n: '02',
    title: 'Post or browse structured listings',
    copy: 'Price, condition, photos, pickup area, and availability show up before the first message.',
    visual: '$140 desk / Lakeshore',
  },
  {
    n: '03',
    title: 'Message from the item',
    copy: 'Every buyer thread starts from a listing, so the seller and item context stay attached.',
    visual: 'Maya -> walnut desk',
  },
  {
    n: '04',
    title: 'Coordinate local pickup',
    copy: 'Start with approximate area and timing, then share exact details only when both sides are ready.',
    visual: 'Sat 10-2 / campus',
  },
] as const;

const benefits = [
  {
    title: 'Buy with shared local context',
    copy: 'See community membership, seller identity, pickup area, and listing details in one place.',
  },
  {
    title: 'Sell with fewer back-and-forths',
    copy: 'Structured listing fields help buyers understand price, condition, timing, and pickup fit before they ask.',
  },
  {
    title: 'Keep coordination item-anchored',
    copy: 'Messages stay tied to the item and seller, making the next step easier to scan.',
  },
  {
    title: 'Moderate the first trust loop',
    copy: 'Reports, admin review, and explicit listing removal give communities practical control.',
  },
] as const;

const commitments = [
  {
    title: 'Built for verified communities',
    copy: 'Community access, seller identity, and listing context appear before high-intent actions.',
  },
  {
    title: 'Focused on safer handoffs',
    copy: 'Approximate pickup areas and item-anchored messages keep coordination clear without exposing exact addresses too early.',
  },
  {
    title: 'Ready for real student stories',
    copy: 'The page is structured to feature launch testimonials and community stats as soon as they are available.',
  },
] as const;

const accessPlans = [
  {
    title: 'Browse',
    price: 'Free',
    label: 'for verified members',
    featured: false,
    items: ['Community-scoped listings', 'Seller trust cards', 'Saved item context'],
  },
  {
    title: 'Sell',
    price: 'Free',
    label: 'highlighted for launch',
    featured: true,
    items: ['Photo-backed listings', 'Buyer contact inbox', 'Sold lifecycle tools'],
  },
  {
    title: 'Admin',
    price: 'Invite only',
    label: 'for community operators',
    featured: false,
    items: ['Invite-code setup', 'Member management', 'Report review'],
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
    <main className="bg-[linear-gradient(180deg,#fff9d7_0%,#f7f4ea_22%,#ffffff_48%,#f1f0fb_72%,#111111_100%)] text-[var(--text-primary)]">
      <Header />
      <Hero />
      <CommunityProof />
      <ProblemPain />
      <HowItWorks />
      <Benefits />
      <TrustCommitments />
      <LaunchAccess />
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
            Sellr&apos;s verified UW-Madison marketplace for local listings,
            item-tied messages, and pickup coordination that starts with
            community context.
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
              href="#preview"
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--text-primary)] no-underline transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              Preview listings
            </Link>
          </div>
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              wisc.edu access
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              Approximate pickup areas
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1">
              Item-linked inbox
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
              The marketplace opens around the item, seller, and pickup.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Join with verified access, then browse listings with photos,
            seller context, and messages that stay attached to the item.
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

function ProblemPain() {
  return (
    <section
      id="why"
      aria-labelledby="pain-heading"
      className="bg-[radial-gradient(circle_at_25%_0%,#34295f_0%,#111111_38%,#050505_100%)] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase text-[#f6e84c]">
              The pain
            </p>
            <h2
              id="pain-heading"
              className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl"
            >
              Local resale breaks after the listing.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">
              The hard part is not posting a desk or finding a lamp. It is
              knowing who you are meeting, what community they belong to, and
              whether the pickup will actually happen.
            </p>
          </div>

          <div className="grid gap-4">
            {painItems.map((item, index) => (
              <article
                key={item.title}
                className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:grid-cols-[5rem_1fr] sm:p-6"
              >
                <span className="text-5xl font-semibold leading-none text-[#f6e84c]">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-semibold leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {item.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
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
            See the buyer/seller path in four moves.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-black/10 bg-white p-4 shadow-xl shadow-black/5">
            <div className="rounded-[1.5rem] bg-[#111111] p-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm font-semibold">Sellr flow demo</span>
                <span className="rounded-full bg-[#f6e84c] px-3 py-1 text-xs font-semibold text-black">
                  30 sec path
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {flowSteps.map((step) => (
                  <div
                    key={step.n}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-[#f6e84c]">
                        {step.n}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/75">
                        {step.visual}
                      </span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      {step.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
              App preview
            </p>
            <h3 className="mt-4 text-3xl font-semibold leading-tight">
              The flow stays tied to the item.
            </h3>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              Listing details, seller context, and messages stay connected from
              browse to pickup, so buyers and sellers do not have to rebuild
              trust in a separate thread.
            </p>
            <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-[#f7f4ea]">
              <div className="grid grid-cols-3 border-b border-black/10 text-xs font-semibold">
                <span className="bg-[#f6e84c] px-3 py-2">Verify</span>
                <span className="px-3 py-2">List</span>
                <span className="px-3 py-2">Meet</span>
              </div>
              <div className="p-4">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-sm font-semibold">Walnut writing desk</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    $140 / Lakeshore / Maya R.
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold">
                  <div className="rounded-2xl bg-white p-3">
                    Verified community
                  </div>
                  <div className="rounded-2xl bg-white p-3">
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

function Benefits() {
  return (
    <section
      id="benefits"
      aria-labelledby="benefits-heading"
      className="bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ea_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
            Features as benefits
          </p>
          <h2
            id="benefits-heading"
            className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Outcomes buyers and sellers can feel.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-3xl border border-black/10 bg-[#f7f4ea] p-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6e84c] text-black">
                <CheckIcon />
              </span>
              <h3 className="mt-6 text-xl font-semibold leading-snug">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {benefit.copy}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustCommitments() {
  return (
    <section
      aria-labelledby="commitments-heading"
      className="border-y border-black/10 bg-[linear-gradient(135deg,#fff9d7_0%,#f7f4ea_46%,#f1f0fb_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
              Trust commitments
            </p>
            <h2
              id="commitments-heading"
              className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
            >
              Trust starts before the meetup.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
              The first launch page should make the buyer and seller feel
              understood, even before community stories and usage stats are
              ready to publish.
            </p>
          </div>

          <div className="grid gap-3">
            {commitments.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-black/10 bg-white p-5"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LaunchAccess() {
  return (
    <section
      id="access"
      aria-labelledby="access-heading"
      className="bg-[linear-gradient(180deg,#ffffff_0%,#fffdf0_100%)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
            Launch access
          </p>
          <h2
            id="access-heading"
            className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl"
          >
            Simple launch access.
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
            Browsing and selling are free for the initial community launch.
            Community admin tools stay limited to trusted operators.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {accessPlans.map((plan) => (
            <article
              key={plan.title}
              className={
                plan.featured
                  ? 'rounded-3xl border border-black bg-[#111111] p-6 text-white shadow-xl shadow-black/10'
                  : 'rounded-3xl border border-black/10 bg-[#f7f4ea] p-6'
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{plan.title}</h3>
                  <p
                    className={
                      plan.featured
                        ? 'mt-1 text-sm text-white/65'
                        : 'mt-1 text-sm text-[var(--text-secondary)]'
                    }
                  >
                    {plan.label}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-[#f6e84c] px-3 py-1 text-xs font-semibold text-black">
                    Launch focus
                  </span>
                ) : null}
              </div>

              <p className="mt-8 text-4xl font-semibold">{plan.price}</p>
              <ul className="mt-8 space-y-3 text-sm">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span
                      className={
                        plan.featured
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[#f6e84c] text-black'
                          : 'flex h-5 w-5 items-center justify-center rounded-full bg-black text-white'
                      }
                    >
                      <CheckIcon size={12} />
                    </span>
                    <span
                      className={
                        plan.featured
                          ? 'text-white/80'
                          : 'text-[var(--text-secondary)]'
                      }
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
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

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <Link href="#preview" className="text-white/65 no-underline hover:text-white">
            Preview
          </Link>
          <Link
            href="#how-it-works"
            className="text-white/65 no-underline hover:text-white"
          >
            How it works
          </Link>
          <Link
            href="#benefits"
            className="text-white/65 no-underline hover:text-white"
          >
            Benefits
          </Link>
          <Link href="#faq" className="text-white/65 no-underline hover:text-white">
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

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}
