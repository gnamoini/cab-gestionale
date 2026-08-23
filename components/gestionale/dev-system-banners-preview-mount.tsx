"use client";

import { useCallback, useState } from "react";
import { NotificationBellIcon } from "@/components/design-system";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { CAB_APP_PRODUCT_NAME } from "@/lib/branding/cab-product-identity";
import { resolveSupabaseConfigurationBannerDetail } from "@/lib/env/supabase-configuration-banner-copy";
import { SupabaseConfigurationBannerView } from "@/components/supabase-configuration-banner";
import {
  DEV_ALL_BANNERS_SESSION_KEY,
  isDevAllBannersPreviewEnabled,
} from "@/lib/ui/dev-all-banners-preview";
import {
  notificationOptInContextLabel,
  notificationOptInDescription,
  type NotificationOptInMode,
} from "@/lib/notifications/notification-opt-in-copy";
import {
  PWA_OFFLINE_BANNER_ARIA_LABEL,
  PWA_OFFLINE_BANNER_DESCRIPTION,
  PWA_OFFLINE_BANNER_TITLE,
} from "@/lib/pwa/pwa-offline-banner-copy";
import { PwaBannerAppIcon } from "@/src/components/pwa-banner-app-icon";
import { SystemBannerOfflineIcon } from "@/components/design-system/system-banner-offline-icon";
import { SystemBannerRefreshIcon } from "@/components/design-system/system-banner-refresh-icon";
import { InventoryReceivingPendingBanner } from "@/components/gestionale/magazzino/carichi/inventory-receiving-pending-banner";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";
import {
  dsSystemBannerContextChip,
  dsSystemBannerGhostBtn,
  dsSystemBannerIconWrap,
  dsSystemBannerPrimaryBtn,
} from "@/lib/ui/design-system";

const DEV_INVENTORY_RECEIVING_PENDING_PREVIEW: InventoryReceivingPendingItem[] = [
  {
    kind: "document",
    id: "preview-doc-1",
    documentId: "preview-doc-1",
    label: "DDT Fornitore ACME · 12/03/2026",
    uiStatus: "PROCESSING",
    resumeStep: "analyze",
    createdAt: "2026-03-12T10:00:00.000Z",
  },
];

import { PwaIosInstallSteps } from "@/src/components/pwa-ios-install-steps";

function DevBannerLabel({ id }: { id: string }) {
  return (
    <p className="border-b border-[color:color-mix(in_srgb,#a78bfa_35%,transparent)] bg-[color:color-mix(in_srgb,#4c1d95_88%,#09090b)] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-violet-200">
      {id}
    </p>
  );
}

function PreviewNotificationOptIn({ mode }: { mode: NotificationOptInMode }) {
  return (
    <SystemBannerShell ariaLabel="Attiva notifiche gestionale (anteprima dev)">
      <SystemBannerLayout
        media={
          <div className={dsSystemBannerIconWrap} aria-hidden>
            <NotificationBellIcon />
          </div>
        }
        title="Attiva le notifiche"
        titleExtra={<span className={dsSystemBannerContextChip}>{notificationOptInContextLabel(mode)}</span>}
        description={notificationOptInDescription(mode)}
        actions={
          <>
            <button type="button" className={dsSystemBannerGhostBtn}>
              No, grazie
            </button>
            <button type="button" className={dsSystemBannerPrimaryBtn}>
              Sì, attiva
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}

function PreviewPwaInstall() {
  return (
    <SystemBannerShell ariaLabel="Installa applicazione (anteprima dev)">
      <SystemBannerLayout
        media={<PwaBannerAppIcon />}
        title={`Installa l'app ${CAB_APP_PRODUCT_NAME}`}
        description="Apri il gestionale come app dedicata, senza barra del browser."
        actions={
          <>
            <button type="button" className={dsSystemBannerGhostBtn}>
              Non ora
            </button>
            <button type="button" className={dsSystemBannerPrimaryBtn}>
              Installa app
            </button>
          </>
        }
      />
    </SystemBannerShell>
  );
}

function PreviewPwaIosHint() {
  return (
    <SystemBannerShell ariaLabel="Aggiungi alla schermata Home (anteprima dev)">
      <SystemBannerLayout
        media={<PwaBannerAppIcon />}
        title={`Aggiungi l'app ${CAB_APP_PRODUCT_NAME}`}
        description="Su iPhone e iPad l'app si installa dalla barra di Safari."
        actions={
          <button type="button" className={dsSystemBannerGhostBtn}>
            Non ora
          </button>
        }
      >
        <PwaIosInstallSteps />
      </SystemBannerLayout>
    </SystemBannerShell>
  );
}

/** DEV — anteprima statica di tutti i banner globali del gestionale. */
export function DevSystemBannersPreviewMount() {
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem(DEV_ALL_BANNERS_SESSION_KEY) === "1",
  );

  const handleDismissPanel = useCallback(() => {
    sessionStorage.setItem(DEV_ALL_BANNERS_SESSION_KEY, "1");
    setDismissed(true);
  }, []);

  if (!isDevAllBannersPreviewEnabled() || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[250] max-h-[min(85dvh,720px)] overflow-y-auto border-b-2 border-violet-500/60 shadow-2xl gestionale-scrollbar"
      role="region"
      aria-label="Anteprima dev banner di sistema"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-violet-500/40 bg-violet-950 px-3 py-2 text-xs text-violet-100">
        <span>
          <span className="font-semibold">DEV</span> — Anteprima banner (
          <code className="text-violet-200">NEXT_PUBLIC_DEV_ALL_BANNERS=1</code> o{" "}
          <code className="text-violet-200">?devBanners=1</code>)
        </span>
        <button
          type="button"
          className="shrink-0 rounded-md border border-violet-400/40 px-2 py-1 text-[11px] font-medium hover:bg-violet-900"
          onClick={handleDismissPanel}
        >
          Nascondi sessione
        </button>
      </div>

      <div className="divide-y divide-[color:color-mix(in_srgb,#ffffff_8%,transparent)]">
        <div>
          <DevBannerLabel id="supabase-configuration-banner" />
          <SupabaseConfigurationBannerView detail={resolveSupabaseConfigurationBannerDetail(null)} />
        </div>

        <div>
          <DevBannerLabel id="data-stale-banner" />
          <SystemBannerShell ariaLabel="Dati aggiornati (anteprima dev)" role="status" placement="inShell">
            <SystemBannerLayout
              media={<SystemBannerRefreshIcon />}
              title="Nuovi dati disponibili"
              description="Un altro operatore ha modificato i dati di questa sezione. Aggiorna la pagina per vedere le modifiche più recenti."
              actions={
                <button type="button" className={dsSystemBannerPrimaryBtn}>
                  Aggiorna pagina
                </button>
              }
            />
          </SystemBannerShell>
        </div>

        <div>
          <DevBannerLabel id="pwa-install-banner" />
          <PreviewPwaInstall />
        </div>

        <div>
          <DevBannerLabel id="pwa-ios-install-hint" />
          <PreviewPwaIosHint />
        </div>

        <div>
          <DevBannerLabel id="pwa-update-banner" />
          <SystemBannerShell ariaLabel="Aggiornamento applicazione (anteprima dev)">
            <SystemBannerLayout
              media={<SystemBannerRefreshIcon />}
              title="Nuova versione disponibile"
              description="È disponibile un aggiornamento del gestionale. Ricarica per applicarlo."
              actions={
                <>
                  <button type="button" className={dsSystemBannerGhostBtn}>
                    Più tardi
                  </button>
                  <button type="button" className={dsSystemBannerPrimaryBtn}>
                    Aggiorna
                  </button>
                </>
              }
            />
          </SystemBannerShell>
        </div>

        <div>
          <DevBannerLabel id="notification-opt-in-banner · push" />
          <PreviewNotificationOptIn mode="push" />
        </div>

        <div>
          <DevBannerLabel id="notification-opt-in-banner · browser" />
          <PreviewNotificationOptIn mode="browser" />
        </div>

        <div>
          <DevBannerLabel id="pwa-offline-block-banner" />
          <SystemBannerShell ariaLabel={`${PWA_OFFLINE_BANNER_ARIA_LABEL} (anteprima dev)`} role="status">
            <SystemBannerLayout
              media={<SystemBannerOfflineIcon />}
              title={PWA_OFFLINE_BANNER_TITLE}
              description={PWA_OFFLINE_BANNER_DESCRIPTION}
            />
          </SystemBannerShell>
        </div>

        <div>
          <DevBannerLabel id="inventory-receiving-pending-banner" />
          <div className="bg-[var(--cab-bg-app)] p-3">
            <InventoryReceivingPendingBanner
              items={DEV_INVENTORY_RECEIVING_PENDING_PREVIEW}
              previewMode
            />
          </div>
        </div>
      </div>
    </div>
  );
}
