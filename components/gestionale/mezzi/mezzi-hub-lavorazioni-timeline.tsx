"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  fmtMezziHubDt,
  MezziHubList,
  MezziHubListItem,
  MezziHubListMeta,
  MezziHubListTitle,
} from "@/components/gestionale/mezzi/mezzi-hub-ui";
import { buildPreventiviLavorazioneFocusHref } from "@/lib/preventivi/preventivi-lavorazione-href";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { MezzoSchedaHistoryRow } from "@/src/services/domain/mezzo-schede-history.service";
import { schedeHistoryBadges } from "@/src/services/domain/mezzo-schede-history.service";
import { useClientPagination } from "@/lib/ui/use-client-pagination";
import { TablePagination } from "@/components/gestionale/table-pagination";
import { dsTableActionTextBtnPrimary } from "@/lib/ui/design-system";
import type { SchedaTipo } from "@/types/schede";

type YearGroup = {
  year: string;
  items: MezzoInterventoLavorazione[];
};

function groupByYear(rows: readonly MezzoInterventoLavorazione[]): YearGroup[] {
  const map = new Map<string, MezzoInterventoLavorazione[]>();
  for (const r of rows) {
    const y = String(new Date(r.dataIngresso).getFullYear());
    const list = map.get(y) ?? [];
    list.push(r);
    map.set(y, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, items]) => ({ year, items }));
}

export function MezziHubLavorazioniTimeline({
  interventi,
  schedeHistory,
  onOpenScheda,
  onClose,
  pageSize = 8,
}: {
  interventi: readonly MezzoInterventoLavorazione[];
  schedeHistory: readonly MezzoSchedaHistoryRow[];
  onOpenScheda: (lavorazioneId: string, tipo: SchedaTipo) => void;
  onClose: () => void;
  pageSize?: number;
}) {
  const concluded = useMemo(
    () => interventi.filter((r) => r.dataCompletamento?.trim()),
    [interventi],
  );

  const { page, setPage, pageCount, sliceItems, showPager, label } = useClientPagination(
    concluded.length,
    pageSize,
  );
  const paged = useMemo(() => sliceItems(concluded), [concluded, sliceItems, page]);
  const groups = useMemo(() => groupByYear(paged), [paged]);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.year}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
            {group.year}
          </h4>
          <MezziHubList>
            {group.items.map((r) => {
              const badges = schedeHistoryBadges(schedeHistory, r.id);
              const schedaCount = [badges.ingresso, badges.lavorazioni, badges.ricambi].filter(Boolean).length;
              return (
                <MezziHubListItem key={r.id}>
                  <div className="min-w-0 flex-1">
                    <MezziHubListTitle>
                      Intervento {r.codice?.trim() || r.id.slice(0, 8)}
                      {r.weakMezzoLink ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                          Collegamento debole
                        </span>
                      ) : null}
                    </MezziHubListTitle>
                    <MezziHubListMeta>
                      Ingresso {fmtMezziHubDt(r.dataIngresso)}
                      {r.dataCompletamento ? ` · Uscita ${fmtMezziHubDt(r.dataCompletamento)}` : ""}
                      {r.durataGiorniLabel !== "In corso" ? ` · ${r.durataGiorniLabel}` : ""}
                      {schedaCount > 0 ? ` · ${schedaCount} schede` : ""}
                    </MezziHubListMeta>
                    <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
                      {r.statoFinale}
                      {r.operatorePrincipale ? ` · ${r.operatorePrincipale}` : ""}
                      {r.ricambiCount != null && r.ricambiCount > 0 ? ` · ${r.ricambiCount} ricambi` : ""}
                      {r.oreTotali != null && r.oreTotali > 0 ? ` · ${r.oreTotali} h` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      type="button"
                      className={dsTableActionTextBtnPrimary}
                      onClick={() => {
                        const tipo: SchedaTipo = badges.ingresso
                          ? "ingresso"
                          : badges.lavorazioni
                            ? "lavorazioni"
                            : "ricambi";
                        onOpenScheda(r.id, tipo);
                      }}
                    >
                      Dettaglio
                    </button>
                    <Link
                      href={buildPreventiviLavorazioneFocusHref(r.id, r.origine)}
                      className="text-[11px] text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]"
                      onClick={onClose}
                    >
                      Apri lavorazione
                    </Link>
                  </div>
                </MezziHubListItem>
              );
            })}
          </MezziHubList>
        </section>
      ))}
      {showPager ? (
        <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} label={label} />
      ) : null}
    </div>
  );
}
