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
import type { PreventiviLogStored } from "@/lib/preventivi/preventivi-change-log-storage";

export function PreventiviLogDrawer({
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
  lockScroll,
}: {
  open: boolean;
  onClose: () => void;
  entries: readonly PreventiviLogStored[];
  pagedEntries: readonly PreventiviLogStored[];
  showPager: boolean;
  page: number;
  pageCount: number;
  pagerLabel: string;
  onPageChange: (page: number) => void;
  onDismiss: (id: string) => void;
  lockScroll?: boolean;
}) {
  if (!open) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Log modifiche preventivi"
      ariaLabel="Log modifiche preventivi"
      lockScroll={lockScroll}
    >
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
