'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useMutation } from '@tanstack/react-query';
import { createReport } from '@sellr/api-client';

type ReportTargetType = 'listing' | 'user' | 'message';
type ReportSeverity = 'safety' | 'quality';

type ReportDialogProps = {
  targetId: string;
  targetType: ReportTargetType;
  subjectLabel: string;
  contextLabel?: string;
  triggerLabel?: string;
  triggerClassName?: string;
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  listing: 'Listing',
  user: 'Member',
  message: 'Message',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function ReportDialog({
  targetId,
  targetType,
  subjectLabel,
  contextLabel,
  triggerLabel = 'Report',
  triggerClassName = 'text-sm font-medium text-[var(--color-brand-warm-strong)] underline-offset-2 hover:underline',
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('safety');
  const [formError, setFormError] = useState<string | null>(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;
  const detailsHelpId = `${dialogId}-details-help`;
  const detailsErrorId = `${dialogId}-details-error`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement | null>(null);
  const doneRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const reportMutation = useMutation({
    mutationFn: () =>
      createReport({
        targetId,
        targetType,
        reason: reason.trim(),
        severity,
      }),
    onSuccess: () => {
      setReason('');
      setFormError(null);
    },
  });

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      const focusTarget = reportMutation.isSuccess
        ? doneRef.current
        : detailsRef.current;
      focusTarget?.focus();
    });

    return () => window.clearTimeout(timer);
  }, [open, reportMutation.isSuccess]);

  const openDialog = () => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpen(true);
  };

  const restoreTriggerFocus = () => {
    window.setTimeout(() => {
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
        return;
      }
      triggerRef.current?.focus();
    }, 0);
  };

  const close = () => {
    setOpen(false);
    setFormError(null);
    reportMutation.reset();
    restoreTriggerFocus();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = reason.trim();

    if (trimmed.length < 10) {
      setFormError('Add a little more detail so Sellr can review it.');
      return;
    }
    if (trimmed.length > 500) {
      setFormError('Keep your report under 500 characters.');
      return;
    }

    setFormError(null);
    reportMutation.mutate();
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ??
        [],
    ).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (
        activeElement === first ||
        !dialogRef.current?.contains(activeElement)
      ) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6 backdrop-blur-sm sm:items-center"
          role="presentation"
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            className="app-panel max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto p-5"
          >
            {reportMutation.isSuccess ? (
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  Report submitted
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-[var(--text-secondary)]"
                >
                  Thanks for helping keep Sellr focused on safe, trustworthy
                  local exchanges. This report is tied to the {TARGET_LABELS[
                    targetType
                  ].toLowerCase()} context you selected.
                </p>
                <button
                  ref={doneRef}
                  type="button"
                  onClick={close}
                  className="app-action-primary mt-5 w-full px-4 py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id={titleId}
                      className="text-lg font-semibold text-[var(--text-primary)]"
                    >
                      Report {subjectLabel}
                    </h2>
                    <p
                      id={descriptionId}
                      className="mt-1 text-sm leading-6 text-[var(--text-secondary)]"
                    >
                      Tell us what happened. Reports help community admins
                      review unsafe or misleading activity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-[var(--text-tertiary)] hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 rounded-[var(--radius-lg)] border border-black/10 bg-[var(--bg-secondary)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-brand-contrast)]">
                    Report target
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    {TARGET_LABELS[targetType]} · {subjectLabel}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {contextLabel ??
                      'This report stays attached to the selected marketplace context.'}
                  </p>
                </div>

                <p className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-xs leading-5 text-[var(--color-brand-warm-strong)]">
                  If you feel unsafe, stop the pickup and report it. Do not
                  include sensitive personal details.
                </p>

                <fieldset className="mt-5">
                  <legend className="text-sm font-medium text-[var(--text-primary)]">
                    What kind of issue is this?
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['safety', 'quality'] as const).map((option) => (
                      <label
                        key={option}
                        className={`app-list-row px-3 py-2 text-sm font-semibold ${
                          severity === option
                            ? 'border-[#111111] bg-[#111111] text-[var(--color-brand-primary)]'
                            : 'border-black/10 bg-white text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`report-severity-${targetType}-${targetId}`}
                          value={option}
                          checked={severity === option}
                          onChange={() => setSeverity(option)}
                          className="sr-only"
                        />
                        {option === 'safety'
                          ? 'Safety concern'
                          : 'Quality issue'}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="mt-5 block text-sm font-medium text-[var(--text-primary)]">
                  Details
                  <textarea
                    ref={detailsRef}
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setFormError(null);
                    }}
                    rows={4}
                    maxLength={500}
                    aria-describedby={
                      formError || reportMutation.isError
                        ? `${detailsHelpId} ${detailsErrorId}`
                        : detailsHelpId
                    }
                    aria-invalid={Boolean(formError || reportMutation.isError)}
                    placeholder="Share the specific behavior, listing issue, or message that should be reviewed."
                    className="mt-2 w-full resize-y rounded-[var(--radius-lg)] border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                  />
                </label>
                <p
                  id={detailsHelpId}
                  className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]"
                >
                  10 to 500 characters. Include only what an admin needs to
                  review this marketplace context.
                </p>

                {formError || reportMutation.isError ? (
                  <p
                    id={detailsErrorId}
                    role="alert"
                    className="app-alert mt-3 p-3 text-sm"
                  >
                    {formError ??
                      (reportMutation.error instanceof Error
                        ? reportMutation.error.message
                        : 'Could not submit the report. Try again.')}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="app-action-secondary px-4 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportMutation.isPending}
                    className="app-action-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reportMutation.isPending
                      ? 'Submitting...'
                      : 'Submit report'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
