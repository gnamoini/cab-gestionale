"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyServiceWorkerUpdate,
  getWaitingServiceWorker,
} from "@/lib/pwa/sw-update";
import { getPwaServiceWorkerRegistration } from "@/lib/pwa/sw-client";
import { PWA_UPDATE_EVENT } from "@/src/components/pwa-service-worker-bridge";

function readUpdateVisible(): boolean {
  const registration = getPwaServiceWorkerRegistration();
  if (!registration) return false;
  return Boolean(getWaitingServiceWorker(registration));
}

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  const syncWaiting = useCallback(() => {
    setVisible(readUpdateVisible());
  }, []);

  useEffect(() => {
    const onUpdate = () => syncWaiting();
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    const id = window.requestAnimationFrame(onUpdate);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
    };
  }, [syncWaiting]);

  const handleApply = useCallback(() => {
    const registration = getPwaServiceWorkerRegistration();
    if (!registration?.waiting) return;
    setApplying(true);
    applyServiceWorkerUpdate(registration);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Aggiornamento applicazione"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[var(--cab-shadow-md)]"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 text-xs text-[color:var(--cab-text)]">
          <p className="font-semibold">Nuova versione disponibile</p>
          <p className="mt-0.5 text-[color:var(--cab-text-muted)]">
            È disponibile un aggiornamento del gestionale. Ricarica per applicarlo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <button
            type="button"
            disabled={applying}
            className="rounded-lg bg-[color:var(--cab-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            onClick={handleApply}
          >
            {applying ? "Aggiornamento…" : "Aggiorna"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-[color:var(--cab-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cab-text)] hover:bg-[color:var(--cab-surface-2)]"
            onClick={handleDismiss}
          >
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}
