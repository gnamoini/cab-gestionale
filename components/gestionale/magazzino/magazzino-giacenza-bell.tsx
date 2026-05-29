"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseButton, Tooltip } from "@/components/design-system";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  dsModalBackdrop,
  dsModalPanel,
  dsScrollbar,
  dsTable,
  dsTableHead,
  dsTableRow,
  dsTableWrap,
  dsZModal,
} from "@/lib/ui/design-system";
import { useBodyScrollLock } from "@/lib/ui/use-body-scroll-lock";
import { resolveModalMaxWidthClass } from "@/lib/ui/modal-max-width-class";

const GIACENZA_MODAL_TITLE_ID = "magazzino-giacenza-modal-title";

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

  const close = useCallback(() => setOpen(false), []);

  useBodyScrollLock(open, "MagazzinoGiacenzaBell");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <Tooltip content="Avvisi">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={triggerClassName}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={count > 0 ? `Avvisi giacenza (${count})` : "Avvisi giacenza"}
        >
        <span className="relative inline-flex text-zinc-600 dark:text-zinc-300" aria-hidden>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {count > 0 ? (
            <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="hidden max-w-[10rem] truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100 sm:inline">
          Avvisi giacenza{count > 0 ? ` (${count})` : ""}
        </span>
      </button>
      </Tooltip>

      {open ? (
        <div
          className={`${dsModalBackdrop} ${dsZModal}`}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              close();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={GIACENZA_MODAL_TITLE_ID}
            className={`${dsModalPanel} flex flex-col overflow-hidden p-0 ${resolveModalMaxWidthClass("max-w-3xl")}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--cab-border)] bg-[var(--cab-card)] px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 id={GIACENZA_MODAL_TITLE_ID} className="truncate text-sm font-semibold text-[color:var(--cab-text)]">
                  Sotto scorta minima
                </h2>
                <p className="mt-0.5 text-xs text-[color:var(--cab-text-muted)]">
                  {count === 0 ? "Nessun avviso attivo" : `${count} ricamb${count === 1 ? "io" : "i"} da verificare`}
                </p>
              </div>
              <CloseButton onClick={close} className="shrink-0" />
            </header>

            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 ${dsScrollbar}`}>
              {items.length === 0 ? (
                <p className="py-8 text-center text-sm font-medium text-emerald-700 dark:text-emerald-400">Tutto in regola.</p>
              ) : (
                <div className={`${dsTableWrap} ${dsScrollbar}`}>
                  <table className={`${dsTable} w-full min-w-[640px] text-left text-xs text-zinc-900 dark:text-zinc-100`}>
                    <thead className={`border-b border-zinc-100 dark:border-zinc-800 ${dsTableHead} text-[10px]`}>
                      <tr>
                        <th className="px-2 py-2">Marca</th>
                        <th className="px-2 py-2">Descrizione</th>
                        <th className="px-2 py-2">Codice</th>
                        <th className="px-2 py-2 text-right tabular-nums">Scorta</th>
                        <th className="px-2 py-2 text-right tabular-nums">Min.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p) => (
                        <tr key={p.id} className={dsTableRow}>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-semibold uppercase text-red-800 dark:text-red-200">
                            {p.marca}
                          </td>
                          <td className="max-w-[280px] px-2 py-2 align-top">
                            <button
                              type="button"
                              className={`w-full text-left font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-[color:var(--cab-primary)] hover:decoration-[color:var(--cab-primary)] dark:text-zinc-50 dark:decoration-zinc-600 ${erpFocus}`}
                              onClick={() => {
                                close();
                                onSelectRicambio(p.id);
                              }}
                            >
                              <span className="line-clamp-2">{p.descrizione}</span>
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                            {p.codiceFornitoreOriginale || "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top text-right font-mono tabular-nums font-semibold text-red-700 dark:text-red-300">
                            {p.scorta}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-top text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                            {p.scortaMinima}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
