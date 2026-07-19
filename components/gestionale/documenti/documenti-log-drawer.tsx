"use client";

import { Drawer } from "@/components/design-system";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";

export function DocumentiLogDrawer({
  open,
  onClose,
  entries,
  pagedEntries,
  showPager,
  page,
  pageCount,
  pagerLabel,
  onPageChange,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  entries: readonly { id: string; vm: GestionaleLogViewModel }[];
  pagedEntries: readonly { id: string; vm: GestionaleLogViewModel }[];
  showPager: boolean;
  page: number;
  pageCount: number;
  pagerLabel: string;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Log modifiche documenti" ariaLabel="Log modifiche documenti">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
          {isLoading ? (
            <p className="p-4 text-sm text-[color:var(--cab-text-muted)]">Caricamento…</p>
          ) : entries.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata." />
          ) : (
            <GestionaleLogList>
              {pagedEntries.map((entry) => (
                <li key={entry.id} className="list-none">
                  <GestionaleLogEntryFourLines vm={entry.vm} />
                </li>
              ))}
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
