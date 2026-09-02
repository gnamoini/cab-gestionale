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
import { getPwaUpdateBlockReason } from "@/lib/pwa/pwa-update-guard";
import { getPwaServiceWorkerRegistration } from "@/lib/pwa/sw-client";
import { dsSystemBannerGhostBtn, dsSystemBannerPrimaryBtn } from "@/lib/ui/design-system";
import { PWA_UPDATE_EVENT } from "@/src/components/pwa-service-worker-bridge";
import { SystemBannerRefreshIcon } from "@/components/design-system/system-banner-refresh-icon";

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [applying, setApplying] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    const onUpdate = () => {
      const registration = getPwaServiceWorkerRegistration();
      setVisible(Boolean(registration && getWaitingServiceWorker(registration)));
      setBlockedReason(null);
      setApplying(false);
    };
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    return () => {
      window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
    };
  }, []);

  const handleApply = useCallback(() => {
    const registration = getPwaServiceWorkerRegistration();
    if (!registration?.waiting) return;
    const applied = applyServiceWorkerUpdate(registration);
    if (applied) {
      setBlockedReason(null);
      setApplying(true);
      return;
    }
    setApplying(false);
    setBlockedReason(
      getPwaUpdateBlockReason() ??
        "L'aggiornamento non è pronto. Lascia aperto il gestionale e riprova tra poco.",
    );
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setBlockedReason(null);
  }, []);

  if (!visible) return null;

  return (
    <SystemBannerShell ariaLabel="Aggiornamento applicazione">
      <SystemBannerLayout
        media={<SystemBannerRefreshIcon />}
        title="Nuova versione disponibile"
        description={
          blockedReason ??
          "È disponibile un aggiornamento del gestionale. Ricarica per applicarlo."
        }
        actions={
          <>
            <button type="button" className={dsSystemBannerGhostBtn} onClick={handleDismiss}>
              Più tardi
            </button>
            <button type="button" disabled={applying} className={dsSystemBannerPrimaryBtn} onClick={handleApply}>
              {applying ? "Aggiornamento…" : "Aggiorna"}
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}
