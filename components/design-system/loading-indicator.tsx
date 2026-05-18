"use client";

export function LoadingSpinner({ label = "Caricamento" }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-[var(--cab-primary)] dark:border-zinc-700 dark:border-t-[var(--cab-primary)]" />
    </span>
  );
}

export function PageLoadingOverlay({ show, label = "Caricamento pagina" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--cab-bg-app)_40%,transparent)] backdrop-blur-[1px]">
      <LoadingSpinner label={label} />
    </div>
  );
}
