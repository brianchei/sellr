// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportDialog } from './report-dialog';

vi.mock('@sellr/api-client', () => ({
  createReport: vi.fn(),
}));

function renderReportDialog() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ReportDialog
        targetId="listing-1"
        targetType="listing"
        subjectLabel="this listing"
        contextLabel="Listing reports stay tied to this item and its community."
        triggerLabel="Report listing"
      />
    </QueryClientProvider>,
  );
}

describe('<ReportDialog />', () => {
  it('surfaces report target context and safety guidance', async () => {
    const user = userEvent.setup();
    renderReportDialog();

    await user.click(screen.getByRole('button', { name: 'Report listing' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Report target')).toBeTruthy();
    expect(screen.getByText('Listing · this listing')).toBeTruthy();
    expect(
      screen.getByText(
        'Listing reports stay tied to this item and its community.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/If you feel unsafe, stop the pickup and report it/i),
    ).toBeTruthy();
  });
});
