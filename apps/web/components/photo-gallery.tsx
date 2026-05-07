'use client';

import Image from 'next/image';
import { useRef } from 'react';

type PhotoGalleryProps = {
  photos: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  title: string;
  category: string;
  subcategory: string | null;
};

export function PhotoGallery({
  photos,
  selectedIndex,
  onSelect,
  title,
  category,
  subcategory,
}: PhotoGalleryProps) {
  const safeIndex = Math.min(selectedIndex, Math.max(photos.length - 1, 0));
  const primaryPhoto = photos[safeIndex];
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    requestAnimationFrame(() => {
      tabRefs.current[index]?.focus();
    });
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (photos.length <= 1) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (safeIndex + 1) % photos.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (safeIndex - 1 + photos.length) % photos.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = photos.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      onSelect(nextIndex);
      focusTab(nextIndex);
    }
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full bg-[var(--bg-tertiary)] sm:aspect-[16/10]">
        {primaryPhoto ? (
          <Image
            key={primaryPhoto}
            src={primaryPhoto}
            alt={`${title} — photo ${safeIndex + 1} of ${photos.length}`}
            fill
            sizes="(min-width: 1024px) 720px, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-tertiary)]">
            No photo provided
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--color-brand-contrast)] shadow-sm">
            {category}
          </span>
          {subcategory ? (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
              {subcategory}
            </span>
          ) : null}
        </div>

        {photos.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white sm:bottom-4 sm:right-4">
            {safeIndex + 1} / {photos.length}
          </span>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div
          role="tablist"
          aria-label="Listing photos"
          className="flex gap-2 overflow-x-auto border-b border-[var(--border-default)] bg-[var(--bg-secondary)] p-3"
        >
          {photos.map((photo, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={photo}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show photo ${index + 1}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(index)}
                onKeyDown={handleTabKeyDown}
                className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast)] focus-visible:ring-offset-1"
                style={{
                  borderColor: selected
                    ? 'var(--color-brand-contrast)'
                    : 'var(--border-default)',
                }}
              >
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
