"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Drawer,
  LogEntry,
  NotificationBellTrigger,
  NotificationOpenLink,
  Tooltip,
} from "@/components/design-system";
import {
  GestionaleLogEmpty,
  GestionaleLogList,
  gestionaleLogDrawerPanelFillClass,
  gestionaleLogDrawerScrollInsetClass,
  gestionaleLogPanelAsideClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import { toMagazzinoSottoScortaLogViewModel } from "@/lib/magazzino/magazzino-sotto-scorta-notification-message";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

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

function MagazzinoSottoScortaMessageRow({
  item,
  onOpen,
}: {
  item: RicambioMagazzino;
  onOpen: () => void;
}) {
  const vm = toMagazzinoSottoScortaLogViewModel(item);

  return (
    <div className="min-w-0">
      <LogEntry vm={vm} onClick={onOpen} title="Apri ricambio" />
      <div className="-mt-1 mb-1 px-3">
        <NotificationOpenLink label="Apri ricambio" onOpen={onOpen} />
      </div>
    </div>
  );
}

export function MagazzinoGiacenzaBell({
  count,
  items,
  onSelectRicambio,
  triggerClassName,
  triggerVariant = "toolbar",
}: {
  count: number;
  items: RicambioMagazzino[];
  onSelectRicambio: (id: string) => void;
  triggerClassName?: string;
  triggerVariant?: "toolbar" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const sortedItems = useMemo(() => sortSottoScortaItems(items), [items]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const openRicambio = useCallback(
    (id: string) => {
      close();
      onSelectRicambio(id);
    },
    [close, onSelectRicambio],
  );

  const alertLabel = count > 0 ? `Avvisi giacenza (${count})` : "Avvisi giacenza";
  const hasAlerts = count > 0;
  const drawerTitle = count > 0 ? `Sotto scorta minima (${count})` : "Sotto scorta minima";

  return (
    <>
      <div className="relative shrink-0">
        <Tooltip content={alertLabel}>
          <NotificationBellTrigger
            count={count}
            active={hasAlerts}
            activeTone="danger"
            ariaLabel={alertLabel}
            ariaExpanded={open}
            onClick={toggle}
            variant={triggerVariant}
            className={triggerClassName}
          />
        </Tooltip>
      </div>

      <Drawer
        open={open}
        onClose={close}
        onBack={close}
        title={drawerTitle}
        ariaLabel="Avvisi giacenza magazzino"
        asideClassName={gestionaleLogPanelAsideClass}
        contentFill
      >
        <div className={gestionaleLogDrawerPanelFillClass}>
          <div
            className={`${gestionaleLogScrollEmbeddedClass} ${gestionaleLogDrawerScrollInsetClass} min-h-0 min-w-0 flex-1 ${
              sortedItems.length === 0 ? "flex flex-col items-center justify-center" : ""
            }`}
          >
            {sortedItems.length === 0 ? (
              <GestionaleLogEmpty message="Nessun ricambio sotto la scorta minima impostata." />
            ) : (
              <GestionaleLogList>
                {sortedItems.map((p) => (
                  <li key={p.id} className="list-none">
                    <MagazzinoSottoScortaMessageRow item={p} onOpen={() => openRicambio(p.id)} />
                  </li>
                ))}
              </GestionaleLogList>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
