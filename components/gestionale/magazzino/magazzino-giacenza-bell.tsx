"use client";

import { useCallback, useMemo, useState } from "react";
import { Tooltip } from "@/components/design-system";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
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

function MagazzinoSottoScortaAlertRow({
  p,
  onOpen,
}: {
  p: RicambioMagazzino;
  onOpen: (id: string) => void;
}) {
  const deficit = sottoScortaDeficit(p);
  const codice = p.codiceFornitoreOriginale.trim() || "—";

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        className={`flex w-full min-w-0 items-start gap-3 rounded-[var(--ds-radius-xl)] border border-red-200/90 bg-red-50/55 p-3.5 text-left shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow] hover:border-red-300/90 hover:bg-red-50/80 active:scale-[0.995] dark:border-red-900/55 dark:bg-red-950/30 dark:hover:border-red-800/70 dark:hover:bg-red-950/45 ${erpFocus}`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-[color:var(--cab-text)]">
            {p.descrizione.trim() || "—"}
          </p>
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-200">
            {p.marca.trim() || "—"}
          </p>
          <p className="truncate font-mono text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">{codice}</p>
          {deficit > 0 ? (
            <p className="text-[11px] font-medium tabular-nums text-red-700 dark:text-red-300">
              Mancano {deficit} {deficit === 1 ? "pezzo" : "pezzi"} rispetto al minimo
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--ds-radius-lg)] bg-red-100 font-mono text-lg font-bold tabular-nums text-red-900 ring-2 ring-[var(--cab-card)] dark:bg-red-950 dark:text-red-100"
            aria-label={`Giacenza ${p.scorta}`}
          >
            {p.scorta}
          </span>
          <span className="text-[10px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
            min. {p.scortaMinima}
          </span>
        </div>
      </button>
    </li>
  );
}

function formatGiacenzaBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

function MagazzinoGiacenzaBellIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-[1.375rem] w-[1.375rem] ${active ? "text-red-700 dark:text-red-200" : "text-[color:var(--cab-text-muted)]"}`}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.12 : undefined}
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function MagazzinoGiacenzaCountBadge({ count }: { count: number }) {
  const label = formatGiacenzaBadgeCount(count);
  const wide = count > 9;
  return (
    <span
      className={[
        "pointer-events-none absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-red-600 font-bold tabular-nums leading-none text-white ring-2 ring-[var(--cab-card)]",
        wide ? "h-[1.125rem] min-w-[1.375rem] px-1 text-[9px]" : "size-[1.125rem] text-[10px]",
      ].join(" ")}
      aria-hidden
    >
      {label}
    </span>
  );
}

function MagazzinoSottoScortaEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-12 text-center">
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
        aria-hidden
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Tutto in regola</p>
      <p className="max-w-[16rem] text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
        Nessun ricambio sotto la scorta minima impostata.
      </p>
    </div>
  );
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
  triggerClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const sortedItems = useMemo(() => sortSottoScortaItems(items), [items]);

  const close = useCallback(() => setOpen(false), []);

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

  return (
    <>
      <Tooltip content={alertLabel}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={[
            triggerClassName,
            "overflow-visible sm:h-auto sm:min-h-[2.5rem] sm:w-auto sm:gap-2 sm:px-3 sm:py-2",
            hasAlerts
              ? "border-red-300/80 bg-red-50/70 text-red-900 hover:bg-red-100/80 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100 dark:hover:bg-red-950/50"
              : "",
          ].join(" ")}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={alertLabel}
        >
          <span className="relative inline-flex shrink-0 items-center justify-center" aria-hidden>
            <MagazzinoGiacenzaBellIcon active={hasAlerts} />
            {hasAlerts ? <MagazzinoGiacenzaCountBadge count={count} /> : null}
          </span>
          <span className="hidden truncate text-xs font-semibold sm:inline">Avvisi giacenza</span>
        </button>
      </Tooltip>

      {open ? (
        <GestionaleModalShell
          onRequestClose={close}
          alignTop
          title="Sotto scorta minima"
          subtitle={subtitle}
          titleId="magazzino-giacenza-modal-title"
        >
          <GestionaleModalScrollBody className="space-y-3 sm:pb-5">
            {sortedItems.length === 0 ? (
              <MagazzinoSottoScortaEmptyState />
            ) : (
              <>
                <p className="text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
                  Ordinati per urgenza. Tocca un ricambio per aprirlo in elenco con filtro attivo.
                </p>
                <ul className="space-y-2.5" role="list">
                  {sortedItems.map((p) => (
                    <MagazzinoSottoScortaAlertRow key={p.id} p={p} onOpen={openRicambio} />
                  ))}
                </ul>
              </>
            )}
          </GestionaleModalScrollBody>
        </GestionaleModalShell>
      ) : null}
    </>
  );
}
