"use client";

import { Drawer } from "@/components/design-system";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryDismissButton,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import type { DocumentiLogStored } from "@/lib/documenti/documenti-change-log-storage";

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
  onDismiss,
}: {
  open: boolean;
  onClose: () => void;
  entries: readonly DocumentiLogStored[];
  pagedEntries: readonly DocumentiLogStored[];
  showPager: boolean;
  page: number;
  pageCount: number;
  pagerLabel: string;
  onPageChange: (page: number) => void;
  onDismiss: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Log modifiche documenti" ariaLabel="Log modifiche documenti">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
          {entries.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata." />
          ) : (
            <GestionaleLogList>
              {pagedEntries.map((entry) => (
                <li key={entry.id} className="list-none">
                  <GestionaleLogEntryFourLines
                    vm={{
                      tone: entry.tone,
                      tipoRiga: entry.tipoRiga,
                      oggettoRiga: entry.oggettoRiga,
                      modificaRiga: entry.modificaRiga,
                      autore: entry.autore,
                      atIso: entry.atIso,
                    }}
                    trailing={<GestionaleLogEntryDismissButton onDismiss={() => onDismiss(entry.id)} />}
                  />
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
