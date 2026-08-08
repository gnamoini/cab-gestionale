"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Drawer, LoadingFormSkeleton, ContentReveal } from "@/components/design-system";
import { gestionaleCollapsibleSectionTitleClassName } from "@/components/design-system/gestionale-collapsible-section";
import { SettingsEmptyState } from "@/components/dashboard/settings-list-ui";
import {
  gestionaleLogDrawerPanelFillClass,
  gestionaleLogDrawerScrollInsetClass,
  gestionaleLogPanelAsideClass,
  gestionaleLogScrollClass,
} from "@/components/gestionale/gestionale-log-ui";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import type {
  NotificationSettingsPageViewModel,
  NotificationSettingsViewModel,
} from "@/lib/notifications/preferences/notification-preferences-api";
import { dsCheckboxInput } from "@/lib/ui/design-system";

type NotificationSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  layerClassName?: string;
  lockScroll?: boolean;
  portaled?: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
};

async function fetchSettingsViewModel(): Promise<NotificationSettingsViewModel> {
  const res = await fetch("/api/notifications/preferences");
  if (!res.ok) throw new Error("load_failed");
  return (await res.json()) as NotificationSettingsViewModel;
}

function withEnabled(
  vm: NotificationSettingsViewModel,
  notificationEventId: string,
  enabled: boolean,
): NotificationSettingsViewModel {
  return {
    channelPreferences: vm.channelPreferences,
    pages: vm.pages.map((page) => {
      const events = page.events.map((event) =>
        event.notificationEventId === notificationEventId
          ? {
              ...event,
              enabled,
              preferenceSource: "personalized" as const,
              canRestore: true,
            }
          : event,
      );
      return {
        ...page,
        events,
        enabledCount: events.filter((e) => e.enabled).length,
      };
    }),
  };
}

function PageSection({
  page,
  onToggle,
  savingId,
}: {
  page: NotificationSettingsPageViewModel;
  onToggle: (notificationEventId: string, enabled: boolean) => void;
  savingId: string | null;
}) {
  return (
    <section className="min-w-0">
      <h2 className={`${gestionaleCollapsibleSectionTitleClassName} mb-2`}>
        {page.label} ({page.enabledCount}/{page.totalCount})
      </h2>
      <ul className="space-y-3">
        {page.events.map((event) => (
          <li key={event.notificationEventId}>
            <label className="flex min-w-0 cursor-pointer items-start gap-2.5 py-0.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
              <input
                type="checkbox"
                className={`${dsCheckboxInput} mt-0.5`}
                checked={event.enabled}
                disabled={savingId === event.notificationEventId}
                onChange={(e) => onToggle(event.notificationEventId, e.target.checked)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[color:var(--cab-text)]">{event.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[color:var(--cab-text-muted)]">
                  {event.description}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NotificationSettingsModal({
  open,
  onClose,
  layerClassName,
  lockScroll = true,
  portaled = true,
  restoreFocusRef,
}: NotificationSettingsModalProps) {
  const gestToast = useGestionaleToast();
  const [loading, setLoading] = useState(true);
  const [vm, setVm] = useState<NotificationSettingsViewModel>({
    pages: [],
    channelPreferences: { inbox: true, push: true, email: false },
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const hasContent = vm.pages.length > 0;
  const showSkeleton = loading && !hasContent;

  const reload = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      try {
        setVm(await fetchSettingsViewModel());
      } catch {
        if (!silent) gestToast.error("Impossibile caricare le impostazioni notifiche.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [gestToast],
  );

  useEffect(() => {
    if (!open) return;
    void reload({ silent: hasContent });
    // Solo all'apertura: non ritriggerare su hasContent dopo patch ottimistico.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-driven fetch
  }, [open, reload]);

  const patchEnabled = useCallback(
    async (notificationEventId: string, enabled: boolean) => {
      let snapshot: NotificationSettingsViewModel | null = null;
      setVm((prev) => {
        snapshot = prev;
        return withEnabled(prev, notificationEventId, enabled);
      });
      setSavingId(notificationEventId);
      try {
        const res = await fetch(`/api/notifications/preferences/${encodeURIComponent(notificationEventId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });
        if (!res.ok) throw new Error("patch_failed");
      } catch {
        if (snapshot) setVm(snapshot);
        gestToast.error("Errore salvataggio preferenza.");
      } finally {
        setSavingId(null);
      }
    },
    [gestToast],
  );

  const drawerPanel = (
    <Drawer
      open={open}
      onClose={onClose}
      title="Impostazioni notifiche"
      ariaLabel="Impostazioni notifiche"
      asideClassName={gestionaleLogPanelAsideClass}
      layerClassName={layerClassName}
      lockScroll={lockScroll}
      restoreFocusRef={restoreFocusRef}
      contentFill
    >
      <div className={gestionaleLogDrawerPanelFillClass}>
        <div className={`${gestionaleLogScrollClass} ${gestionaleLogDrawerScrollInsetClass} min-h-0 min-w-0 flex-1`}>
          {showSkeleton ? (
            <LoadingFormSkeleton sections={3} className="py-1" />
          ) : !hasContent ? (
            <SettingsEmptyState>Nessuna notifica configurabile per il tuo profilo.</SettingsEmptyState>
          ) : (
            <ContentReveal data-testid="content-reveal">
              <div className="space-y-5 pb-1" aria-busy={savingId != null}>
              <section className="min-w-0">
                <h2 className={`${gestionaleCollapsibleSectionTitleClassName} mb-2`}>Canali di consegna</h2>
                <ul className="space-y-2 text-sm text-[color:var(--cab-text)]">
                  <li>Inbox interno: {vm.channelPreferences.inbox ? "attivo" : "disattivo"}</li>
                  <li>Push mobile: {vm.channelPreferences.push ? "attivo" : "disattivo"}</li>
                  <li>Email: {vm.channelPreferences.email ? "attivo" : "disattivo"}</li>
                </ul>
              </section>
              {vm.pages.map((page) => (
                <PageSection
                  key={page.key}
                  page={page}
                  onToggle={(id, enabled) => void patchEnabled(id, enabled)}
                  savingId={savingId}
                />
              ))}
              </div>
            </ContentReveal>
          )}
        </div>
      </div>
    </Drawer>
  );

  if (portaled && typeof document !== "undefined") {
    return createPortal(drawerPanel, document.body);
  }

  return drawerPanel;
}
