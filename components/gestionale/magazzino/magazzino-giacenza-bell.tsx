"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  NotificationBellTrigger,
  NotificationEmptyState,
  NotificationList,
  NotificationPanelHeader,
  NotificationPanelShell,
  NotificationSottoScortaRow,
  Tooltip,
} from "@/components/design-system";
import {
  useDropdownOutsideDismiss,
  useGlobalDropdownPortal,
} from "@/components/gestionale/global-input/use-global-dropdown-portal";
import { GLOBAL_DROPDOWN_VIEWPORT_PAD } from "@/lib/ui/global-dropdown-portal";
import {
  dsNotificationPanelMaxHeightPx,
  dsNotificationPanelMinWidthPx,
  dsNotificationPanelWidthPx,
} from "@/lib/ui/notification-ui";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

const PANEL_TITLE_ID = "magazzino-giacenza-panel-title";

function sottoScortaDeficit(p: RicambioMagazzino): number {
  return Math.max(0, p.scortaMinima - p.scorta);
}

function sortSottoScortaItems(items: RicambioMagazzino[]): RicambioMagazzino[] {
  return [...items].sort((a, b) => {
    const deficit = sottoScortaDeficit(b) - sottoScortaDeficit(a);
    if (deficit !== 0) return deficit;
    if (a.scorta !== b.scorta) return a.scorta - b.scorta;
    return a.descrizione.localeCompare(b.descrizione, "it", { sensitivity: "base" });
  });
}

function resolveNotificationPanelWidth(): number {
  const vwCap = Math.max(
    dsNotificationPanelMinWidthPx,
    (typeof document !== "undefined" ? document.documentElement.clientWidth : 0) -
      GLOBAL_DROPDOWN_VIEWPORT_PAD * 2,
  );
  return Math.min(Math.max(dsNotificationPanelWidthPx, dsNotificationPanelMinWidthPx), vwCap);
}

export function MagazzinoGiacenzaBell({
  count,
  items,
  onSelectRicambio,
  triggerClassName,
}: {
  count: number;
  items: RicambioMagazzino[];
  onSelectRicambio: (id: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null); // contentRef per portal + outside dismiss
  const sortedItems = useMemo(() => sortSottoScortaItems(items), [items]);

  useBodyScrollLock(open, "MagazzinoGiacenzaBell");

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const panelWidthPx = resolveNotificationPanelWidth();

  const { style, floatingRef, isPositioned } = useGlobalDropdownPortal({
    open: open && mounted,
    anchorRef,
    contentRef: panelRef,
    placement: "bottom-end",
    matchAnchorWidth: false,
    panelWidth: panelWidthPx,
    maxHeight: dsNotificationPanelMaxHeightPx,
    repositionDeps: [open, sortedItems.length, panelWidthPx],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useDropdownOutsideDismiss(open, anchorRef, panelRef, close, { when: isPositioned });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const openRicambio = useCallback(
    (id: string) => {
      close();
      onSelectRicambio(id);
    },
    [close, onSelectRicambio],
  );

  const subtitle =
    count === 0
      ? "Nessun avviso attivo"
      : `${count} ricamb${count === 1 ? "io" : "i"} da verificare`;

  const alertLabel = count > 0 ? `Avvisi giacenza (${count})` : "Avvisi giacenza";
  const hasAlerts = count > 0;

  const panel =
    open && mounted && style ? (
      <NotificationPanelShell
        titleId={PANEL_TITLE_ID}
        shellRef={floatingRef}
        style={style}
        onMouseDown={(e) => e.stopPropagation()}
        header={
          <NotificationPanelHeader
            title="Sotto scorta minima"
            titleId={PANEL_TITLE_ID}
            count={count}
            subtitle={subtitle}
            onClose={close}
          />
        }
      >
        {sortedItems.length === 0 ? (
          <NotificationEmptyState
            variant="success"
            description="Nessun ricambio sotto la scorta minima impostata."
          />
        ) : (
          <NotificationList>
            {sortedItems.map((p) => (
              <li key={p.id} className="list-none">
                <NotificationSottoScortaRow
                  descrizione={p.descrizione}
                  marca={p.marca}
                  scorta={p.scorta}
                  scortaMinima={p.scortaMinima}
                  codice={p.codiceFornitoreOriginale}
                  deficit={sottoScortaDeficit(p)}
                  onClick={() => openRicambio(p.id)}
                />
              </li>
            ))}
          </NotificationList>
        )}
      </NotificationPanelShell>
    ) : null;

  return (
    <div className="relative shrink-0">
      <Tooltip content={alertLabel}>
        <NotificationBellTrigger
          buttonRef={anchorRef}
          count={count}
          active={hasAlerts}
          activeTone="danger"
          ariaLabel={alertLabel}
          ariaExpanded={open}
          onClick={toggle}
          className={triggerClassName}
        />
      </Tooltip>

      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
