// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createReport } from '@sellr/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportDialog } from './report-dialog';

vi.mock('@sellr/api-client', () => ({
  createReport: vi.fn(),
}));

const createReportMock = vi.mocked(createReport);

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
  beforeEach(() => {
    createReportMock.mockReset();
  });

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

  it('moves focus into the dialog and restores it when closed with Escape', async () => {
    const user = userEvent.setup();
    renderReportDialog();
    const trigger = screen.getByRole('button', { name: 'Report listing' });

    await user.click(trigger);
    const details = screen.getByRole('textbox', { name: 'Details' });

    await waitFor(() => {
      expect(document.activeElement).toBe(details);
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('keeps keyboard focus inside the report dialog while open', async () => {
    const user = userEvent.setup();
    renderReportDialog();

    await user.click(screen.getByRole('button', { name: 'Report listing' }));
    const submit = screen.getByRole('button', { name: 'Submit report' });
    submit.focus();

    await user.keyboard('{Tab}');

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    );
  });

  it('submits a valid report and focuses the success action', async () => {
    createReportMock.mockResolvedValue({ report: { id: 'report-1' } });
    const user = userEvent.setup();
    renderReportDialog();
    const trigger = screen.getByRole('button', { name: 'Report listing' });

    await user.click(trigger);
    await user.click(screen.getByRole('radio', { name: 'Quality issue' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Details' }),
      'The listing photos do not match the item described for pickup.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalledWith({
        targetId: 'listing-1',
        targetType: 'listing',
        reason:
          'The listing photos do not match the item described for pickup.',
        severity: 'quality',
      });
    });

    expect(await screen.findByText('Report submitted')).toBeTruthy();
    const done = screen.getByRole('button', { name: 'Done' });

    await waitFor(() => {
      expect(document.activeElement).toBe(done);
    });

    await user.click(done);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('keeps short reports local and announces the validation error', async () => {
    const user = userEvent.setup();
    renderReportDialog();

    await user.click(screen.getByRole('button', { name: 'Report listing' }));
    await user.type(screen.getByRole('textbox', { name: 'Details' }), 'Too few');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect(createReportMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain(
      'Add a little more detail so Sellr can review it.',
    );
  });

  it('clears a submit failure once the reporter edits the details', async () => {
    createReportMock.mockRejectedValueOnce(new Error('Report failed'));
    const user = userEvent.setup();
    renderReportDialog();

    await user.click(screen.getByRole('button', { name: 'Report listing' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Details' }),
      'The seller requested a payment code before pickup.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Report failed',
    );

    await user.type(screen.getByRole('textbox', { name: 'Details' }), ' More');

    await waitFor(() => {
      expect(screen.queryByText('Report failed')).toBeNull();
    });
  });

  it('marks the form busy and locks report details while submitting', async () => {
    createReportMock.mockImplementation(
      () => new Promise(() => undefined),
    );
    const user = userEvent.setup();
    renderReportDialog();

    await user.click(screen.getByRole('button', { name: 'Report listing' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Details' }),
      'The seller requested a payment code before pickup.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit report' }));

    await waitFor(() => {
      expect(
        screen
          .getByRole('form', { name: 'Report form' })
          .getAttribute('aria-busy'),
      ).toBe('true');
    });
    expect(
      (screen.getByRole('textbox', { name: 'Details' }) as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Submitting...' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
