"use client";

import { memo } from "react";
import { usePwaPushOptIn } from "@/src/hooks/use-pwa-push-opt-in";

const BANNER_SHELL =
  "sticky top-0 z-[88] border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-2.5 shadow-sm";

export const PwaPushOptInBanner = memo(function PwaPushOptInBanner() {
  const { visible, busy, enablePush, dismissPushOptIn } = usePwaPushOptIn();

  if (!visible) return null;

  return (
    <div role="region" aria-label="Attiva notifiche push" className={BANNER_SHELL}>
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-xs text-[color:var(--cab-text)]">
          <p className="font-semibold">Notifiche push</p>
          <p className="mt-0.5 text-[color:var(--cab-text-muted)]">
            Ricevi avvisi dell&apos;inbox anche con l&apos;app installata o in secondo piano.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-[color:var(--cab-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            onClick={() => void enablePush()}
          >
            {busy ? "Attivazione…" : "Attiva notifiche"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[color:var(--cab-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cab-text)] hover:bg-[color:var(--cab-surface-2)]"
            onClick={dismissPushOptIn}
          >
            Non ora
          </button>
        </div>
      </div>
    </div>
  );
});
