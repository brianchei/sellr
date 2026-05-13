export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t border-black bg-[#111111]"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/65">
        <p className="inline-flex items-center gap-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-[var(--color-brand-primary)]"
          >
            <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z" />
          </svg>
          Local resale within verified communities.
        </p>
        <p>&copy; {year} Sellr</p>
      </div>
    </footer>
  );
}
