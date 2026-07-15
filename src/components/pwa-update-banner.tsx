"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import {
  applyServiceWorkerUpdate,
  getWaitingServiceWorker,
} from "@/lib/pwa/sw-update";
import { getPwaServiceWorkerRegistration } from "@/lib/pwa/sw-client";
import { dsSystemBannerGhostBtn, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { PWA_UPDATE_EVENT } from "@/src/components/pwa-service-worker-bridge";

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const onUpdate = () => {
      const registration = getPwaServiceWorkerRegistration();
      setVisible(Boolean(registration && getWaitingServiceWorker(registration)));
    };
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    return () => {
      window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
    };
  }, []);

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
    <SystemBannerShell ariaLabel="Aggiornamento applicazione">
      <SystemBannerLayout
        title="Nuova versione disponibile"
        description="È disponibile un aggiornamento del gestionale. Ricarica per applicarlo."
        onDismiss={handleDismiss}
        dismissLabel="Chiudi suggerimento aggiornamento"
        actions={
          <>
            <button type="button" disabled={applying} className={dsSystemBannerPrimaryBtn} onClick={handleApply}>
              {applying ? "Aggiornamento…" : "Aggiorna"}
            </button>
            <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
              Più tardi
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}
