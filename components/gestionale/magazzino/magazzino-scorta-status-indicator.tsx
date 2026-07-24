"use client";

/** Indicatore discreto: spinner durante commit, check verde al successo. */
export function MagazzinoScortaStatusIndicator({
  isCommitting,
  showSuccess,
  className = "",
}: {
  isCommitting: boolean;
  showSuccess: boolean;
  className?: string;
}) {
  if (!isCommitting && !showSuccess) return null;

  if (showSuccess) {
    return (
      <span
        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-emerald-600 dark:text-emerald-400 ${className}`.trim()}
        aria-hidden
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
          <path
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[color:var(--cab-text-muted)] border-t-transparent opacity-70 ${className}`.trim()}
      role="status"
      aria-label="Salvataggio in corso"
    />
  );
}
