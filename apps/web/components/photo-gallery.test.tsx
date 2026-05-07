// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoGallery } from './photo-gallery';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt = '',
  }: {
    src: string;
    alt?: string;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

const PHOTOS = [
  '/api/v1/uploads/listing-images/aaaaaaaa-1.jpg',
  '/api/v1/uploads/listing-images/bbbbbbbb-2.jpg',
  '/api/v1/uploads/listing-images/cccccccc-3.jpg',
];

function ControlledGallery({ photos = PHOTOS }: { photos?: string[] }) {
  const [index, setIndex] = useState(0);
  return (
    <PhotoGallery
      photos={photos}
      selectedIndex={index}
      onSelect={setIndex}
      title="Used desk"
      category="home"
      subcategory="furniture"
    />
  );
}

function ariaSelected(tab: HTMLElement) {
  return tab.getAttribute('aria-selected');
}

function tabIndex(tab: HTMLElement) {
  return tab.getAttribute('tabindex');
}

describe('<PhotoGallery />', () => {
  it('renders one tab per photo and only the selected tab is in the tab order', () => {
    render(<ControlledGallery />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(ariaSelected(tabs[0])).toBe('true');
    expect(tabIndex(tabs[0])).toBe('0');
    expect(ariaSelected(tabs[1])).toBe('false');
    expect(tabIndex(tabs[1])).toBe('-1');
    expect(tabIndex(tabs[2])).toBe('-1');
  });

  it('does not render the tablist for a single-photo gallery', () => {
    render(<ControlledGallery photos={[PHOTOS[0]]} />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('shows a "no photo provided" placeholder when given zero photos', () => {
    render(<ControlledGallery photos={[]} />);
    expect(screen.getByText(/No photo provided/i)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('clicking a thumbnail selects it', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    await user.click(screen.getByRole('tab', { name: 'Show photo 2' }));
    expect(
      ariaSelected(screen.getByRole('tab', { name: 'Show photo 2' })),
    ).toBe('true');
    expect(
      ariaSelected(screen.getByRole('tab', { name: 'Show photo 1' })),
    ).toBe('false');
  });

  it('ArrowRight selects the next photo and moves focus to it', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const first = screen.getByRole('tab', { name: 'Show photo 1' });
    first.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(
        ariaSelected(screen.getByRole('tab', { name: 'Show photo 2' })),
      ).toBe('true');
      expect(document.activeElement).toBe(
        screen.getByRole('tab', { name: 'Show photo 2' }),
      );
    });
  });

  it('ArrowLeft from the first photo wraps to the last', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const first = screen.getByRole('tab', { name: 'Show photo 1' });
    first.focus();
    await user.keyboard('{ArrowLeft}');

    await waitFor(() => {
      expect(
        ariaSelected(screen.getByRole('tab', { name: 'Show photo 3' })),
      ).toBe('true');
      expect(document.activeElement).toBe(
        screen.getByRole('tab', { name: 'Show photo 3' }),
      );
    });
  });

  it('ArrowRight from the last photo wraps to the first', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const last = screen.getByRole('tab', { name: 'Show photo 3' });
    // Make the last tab the selected one so ArrowRight wraps end → start.
    await user.click(last);
    last.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(
        ariaSelected(screen.getByRole('tab', { name: 'Show photo 1' })),
      ).toBe('true');
    });
  });

  it('Home jumps focus and selection to the first photo', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const last = screen.getByRole('tab', { name: 'Show photo 3' });
    await user.click(last);
    await waitFor(() => {
      expect(ariaSelected(last)).toBe('true');
    });
    last.focus();
    await user.keyboard('{Home}');

    await waitFor(() => {
      expect(
        ariaSelected(screen.getByRole('tab', { name: 'Show photo 1' })),
      ).toBe('true');
      expect(document.activeElement).toBe(
        screen.getByRole('tab', { name: 'Show photo 1' }),
      );
    });
  });

  it('End jumps focus and selection to the last photo', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const first = screen.getByRole('tab', { name: 'Show photo 1' });
    first.focus();
    await user.keyboard('{End}');

    await waitFor(() => {
      expect(
        ariaSelected(screen.getByRole('tab', { name: 'Show photo 3' })),
      ).toBe('true');
      expect(document.activeElement).toBe(
        screen.getByRole('tab', { name: 'Show photo 3' }),
      );
    });
  });

  it('non-navigation keys are ignored (selection unchanged)', async () => {
    const user = userEvent.setup();
    render(<ControlledGallery />);
    const first = screen.getByRole('tab', { name: 'Show photo 1' });
    first.focus();
    await user.keyboard('a');
    expect(ariaSelected(first)).toBe('true');
  });
});
