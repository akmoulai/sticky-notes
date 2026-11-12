import type { WriteStatus } from '../../persistence/writeQueue';

const LABELS: Record<WriteStatus, string> = {
  idle: 'Saved',
  saving: 'Saving…',
};

// Every label is laid out, hidden, in the same grid cell, so the pill is as wide as the longest label and never shifts.
// Only the visible label is exposed to assistive technology.
export function SaveStatus({ status }: { readonly status: WriteStatus }) {
  return (
    <div className="save-status" data-status={status}>
      {Object.values(LABELS).map((label) => (
        <span key={label} className="save-status-sizer" aria-hidden="true">
          {label}
        </span>
      ))}
      <span role="status">{LABELS[status]}</span>
    </div>
  );
}
