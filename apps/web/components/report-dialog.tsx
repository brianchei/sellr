'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createReport } from '@sellr/api-client';

type ReportTargetType = 'listing' | 'user' | 'message';
type ReportSeverity = 'safety' | 'quality';

type ReportDialogProps = {
  targetId: string;
  targetType: ReportTargetType;
  subjectLabel: string;
  triggerLabel?: string;
  triggerClassName?: string;
};

export function ReportDialog({
  targetId,
  targetType,
  subjectLabel,
  triggerLabel = 'Report',
  triggerClassName = 'text-sm font-medium text-[var(--color-brand-warm-strong)] underline-offset-2 hover:underline',
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState<ReportSeverity>('safety');
  const [formError, setFormError] = useState<string | null>(null);

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

  const close = () => {
    setOpen(false);
    setFormError(null);
    reportMutation.reset();
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-${targetType}-${targetId}-title`}
            className="w-full max-w-md rounded-xl border border-[var(--border-default)] bg-white p-5 shadow-xl"
          >
            {reportMutation.isSuccess ? (
              <div>
                <h2
                  id={`report-${targetType}-${targetId}-title`}
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  Report submitted
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Thanks for helping keep Sellr focused on safe, trustworthy
                  local exchanges.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id={`report-${targetType}-${targetId}-title`}
                      className="text-lg font-semibold text-[var(--text-primary)]"
                    >
                      Report {subjectLabel}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      Reports help Sellr review unsafe or misleading activity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md px-2 py-1 text-sm font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Close
                  </button>
                </div>

                <fieldset className="mt-5">
                  <legend className="text-sm font-medium text-[var(--text-primary)]">
                    What kind of issue is this?
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(['safety', 'quality'] as const).map((option) => (
                      <label
                        key={option}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          severity === option
                            ? 'border-[var(--color-brand-contrast)] bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]'
                            : 'border-[var(--border-default)] bg-white text-[var(--text-secondary)]'
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
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setFormError(null);
                    }}
                    rows={4}
                    maxLength={500}
                    placeholder="Tell us what happened. Do not include sensitive personal details."
                    className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                  />
                </label>

                {formError || reportMutation.isError ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
                  >
                    {formError ??
                      (reportMutation.error instanceof Error
                        ? reportMutation.error.message
                        : 'Could not submit the report. Try again.')}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportMutation.isPending}
                    className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reportMutation.isPending ? 'Submitting...' : 'Submit report'}
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
