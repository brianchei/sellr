'use client';

import { useMemo, useState } from 'react';

const previewTabs = ['Marketplace', 'Listing detail', 'Inbox'] as const;
type PreviewTab = (typeof previewTabs)[number];

const listings = [
  {
    title: 'Walnut writing desk',
    price: '$140',
    category: 'Furniture',
    area: 'Lakeshore',
    condition: 'Like new',
    seller: 'Maya R.',
    tone: 'yellow',
  },
  {
    title: 'Mini fridge, clean',
    price: '$80',
    category: 'Dorm',
    area: 'Southeast',
    condition: 'Good',
    seller: 'Noah P.',
    tone: 'mint',
  },
  {
    title: 'Intro econ textbook',
    price: '$25',
    category: 'Books',
    area: 'State Street',
    condition: 'Used',
    seller: 'Ari T.',
    tone: 'lavender',
  },
] as const;

export function LandingAppPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('Marketplace');
  const [radius, setRadius] = useState(2);

  const radiusLabel = useMemo(
    () => `${radius} ${radius === 1 ? 'mile' : 'miles'}`,
    [radius],
  );

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute inset-x-8 top-8 h-full rounded-[2rem] bg-black/10" />
      <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-3 shadow-2xl shadow-black/10">
        <div className="rounded-[1.5rem] border border-black/10 bg-[#111111] text-white">
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#23f0c7]" />
              <span className="ml-2 text-sm font-semibold">Sellr preview</span>
            </div>
            <div
              className="flex gap-1 rounded-full bg-white/10 p-1"
              role="tablist"
              aria-label="App preview screens"
            >
              {previewTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab
                      ? 'bg-[#f6e84c] text-black'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-[520px] gap-4 p-4 lg:grid-cols-[1.45fr_0.8fr] lg:p-6">
            <div className="rounded-[1.35rem] bg-[#f7f4ea] p-4 text-black sm:p-5">
              {activeTab === 'Marketplace' ? (
                <MarketplacePreview radiusLabel={radiusLabel} />
              ) : null}
              {activeTab === 'Listing detail' ? <ListingDetailPreview /> : null}
              {activeTab === 'Inbox' ? <InboxPreview /> : null}
            </div>

            <aside className="flex flex-col justify-between rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-[#f6e84c]">
                  Live controls
                </p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight">
                  Explore the marketplace the way a student would.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Switch views, adjust pickup radius, and see how listing,
                  seller, and message context stay connected.
                </p>
              </div>

              <div className="mt-8 rounded-2xl bg-white p-4 text-black">
                <label
                  htmlFor="landing-radius"
                  className="flex items-center justify-between gap-4 text-sm font-semibold"
                >
                  Pickup radius
                  <span className="rounded-full bg-[#f6e84c] px-3 py-1 text-xs">
                    {radiusLabel}
                  </span>
                </label>
                <input
                  id="landing-radius"
                  type="range"
                  min="1"
                  max="5"
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="mt-4 w-full accent-black"
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-[#f7f4ea] px-2 py-1 text-center">
                    Verify
                  </span>
                  <span className="rounded-full bg-[#f7f4ea] px-2 py-1 text-center">
                    Browse
                  </span>
                  <span className="rounded-full bg-[#f7f4ea] px-2 py-1 text-center">
                    Meet
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplacePreview({ radiusLabel }: { radiusLabel: string }) {
  return (
    <div>
      <PreviewTopBar title="Marketplace" meta="Badger Market" />
      <div className="mt-4 grid gap-3 rounded-2xl bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
            Search
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            desk, fridge, textbook
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[#f6e84c] px-3 py-1.5">
            Within {radiusLabel}
          </span>
          <span className="rounded-full bg-[#f7f4ea] px-3 py-1.5">
            Has photos
          </span>
          <span className="rounded-full bg-[#f7f4ea] px-3 py-1.5">
            Recently listed
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {listings.map((listing) => (
          <ListingPreviewCard key={listing.title} listing={listing} />
        ))}
      </div>
    </div>
  );
}

function ListingDetailPreview() {
  return (
    <div>
      <PreviewTopBar title="Listing detail" meta="Furniture / Lakeshore" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-[#f6e84c] p-5">
          <p className="text-xs font-semibold uppercase">Photo gallery</p>
          <div className="mt-10 flex h-44 items-end justify-between rounded-2xl bg-white/50 p-4">
            <DeskIcon />
            <div className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
              4 photos
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5">
          <p className="text-sm font-semibold text-[var(--color-brand-contrast)]">
            Walnut writing desk
          </p>
          <p className="mt-2 text-4xl font-semibold">$140</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Solid wood desk, like new. Pickup near Lakeshore on Saturday
            morning.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#f7f4ea] px-3 py-1.5">
              Like new
            </span>
            <span className="rounded-full bg-[#f6e84c] px-3 py-1.5">
              Open to offers
            </span>
          </div>
          <div className="mt-5 rounded-2xl border border-black/10 bg-[#f7f4ea] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                MR
              </span>
              <div>
                <p className="text-sm font-semibold">Maya R.</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Verified in Badger Market
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-contrast-strong)]"
            >
              Contact seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxPreview() {
  return (
    <div>
      <PreviewTopBar title="Inbox" meta="Item-anchored messages" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-2">
          {['Walnut writing desk', 'Mini fridge', 'Econ textbook'].map(
            (item, index) => (
              <div
                key={item}
                className={`rounded-2xl border p-3 ${
                  index === 0
                    ? 'border-black bg-[#f6e84c]'
                    : 'border-black/10 bg-white'
                }`}
              >
                <p className="text-sm font-semibold">{item}</p>
                <p className="mt-1 text-xs text-black/60">
                  {index === 0 ? 'Pickup time confirmed' : 'New message'}
                </p>
              </div>
            ),
          )}
        </div>
        <div className="rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <p className="text-sm font-semibold">Walnut writing desk</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Maya R. / Lakeshore
              </p>
            </div>
            <span className="rounded-full bg-[#f7f4ea] px-3 py-1 text-xs font-semibold">
              $140
            </span>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f7f4ea] px-4 py-3 text-[var(--text-secondary)]">
              Is this still available for pickup Saturday?
            </p>
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-black px-4 py-3 text-white">
              Yes. I can meet near Lakeshore after 10.
            </p>
            <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#f7f4ea] px-4 py-3 text-[var(--text-secondary)]">
              Perfect, I can do 10:30.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTopBar({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
          App view
        </p>
        <h2 className="mt-1 text-3xl font-semibold leading-tight">{title}</h2>
      </div>
      <span className="w-fit rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
        {meta}
      </span>
    </div>
  );
}

function ListingPreviewCard({
  listing,
}: {
  listing: (typeof listings)[number];
}) {
  const bg =
    listing.tone === 'yellow'
      ? 'bg-[#f6e84c]'
      : listing.tone === 'mint'
        ? 'bg-[var(--color-brand-accent-soft)]'
        : 'bg-[var(--color-brand-contrast-soft)]';

  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white">
      <div className={`flex h-32 items-end justify-between p-3 ${bg}`}>
        <DeskIcon small />
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold">
          {listing.category}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-5">{listing.title}</h3>
          <span className="shrink-0 text-sm font-semibold">
            {listing.price}
          </span>
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          {listing.area} / {listing.condition}
        </p>
        <p className="mt-4 text-xs font-semibold text-[var(--color-brand-contrast)]">
          {listing.seller} / verified seller
        </p>
      </div>
    </article>
  );
}

function DeskIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 74 : 140}
      height={small ? 64 : 112}
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
    >
      <rect x="24" y="54" width="112" height="12" rx="3" fill="black" />
      <rect x="40" y="66" width="8" height="42" rx="3" fill="black" />
      <rect x="112" y="66" width="8" height="42" rx="3" fill="black" />
      <rect
        x="58"
        y="26"
        width="44"
        height="28"
        rx="5"
        fill="white"
        fillOpacity="0.75"
      />
      <path d="M36 108h88" stroke="black" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
