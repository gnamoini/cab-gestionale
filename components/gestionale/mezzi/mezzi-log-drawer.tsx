"use client";

import { Drawer, LoadingFormSkeleton } from "@/components/design-system";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  buildMezziGestionaleLogViewModel,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import type { MezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";

export function MezziLogDrawer({
  open,
  onClose,
  loading,
  entries,
  pagedEntries,
  showPager,
  page,
  pageCount,
  pagerLabel,
  onPageChange,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  entries: readonly MezziHubLogEntry[];
  pagedEntries: readonly MezziHubLogEntry[];
  showPager: boolean;
  page: number;
  pageCount: number;
  pagerLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Log modifiche" ariaLabel="Log modifiche mezzi">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
          {loading ? (
            <LoadingFormSkeleton fields={2} className="px-1 py-2" />
          ) : entries.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata su Supabase." />
          ) : (
            <GestionaleLogList>
              {pagedEntries.map((e) => {
                const vm = buildMezziGestionaleLogViewModel({
                  tipo: e.tipo,
                  mezzo: e.mezzo,
                  riepilogo: e.riepilogo,
                  autore: e.autore,
                  at: e.at,
                  changes: e.changes,
                });
                return (
                  <li key={e.id}>
                    <GestionaleLogEntryFourLines vm={vm} />
                  </li>
                );
              })}
            </GestionaleLogList>
          )}
        </div>
        {showPager ? (
          <TablePagination page={page} pageCount={pageCount} onPageChange={onPageChange} label={pagerLabel} />
        ) : null}
      </div>
    </Drawer>
  );
}
