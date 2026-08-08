"use client";

import { Drawer, LoadingFormSkeleton, ContentReveal } from "@/components/design-system";
import { TablePagination } from "@/components/gestionale/table-pagination";
import {
  GestionaleLogEmpty,
  GestionaleLogEntryDismissButton,
  GestionaleLogEntryFourLines,
  GestionaleLogList,
  gestionaleLogDrawerPanelClass,
  gestionaleLogScrollEmbeddedClass,
} from "@/components/gestionale/gestionale-log-ui";
import type { MagazzinoLogFeedItem } from "@/lib/magazzino/use-magazzino-log-feed";

export function MagazzinoLogDrawer({
  open,
  onClose,
  feed,
  loading,
  pagedFeed,
  showPager,
  page,
  pageCount,
  pagerLabel,
  onPageChange,
  onFocusRicambio,
  onDismissLocal,
}: {
  open: boolean;
  onClose: () => void;
  feed: readonly MagazzinoLogFeedItem[];
  loading: boolean;
  pagedFeed: readonly MagazzinoLogFeedItem[];
  showPager: boolean;
  page: number;
  pageCount: number;
  pagerLabel: string;
  onPageChange: (page: number) => void;
  onFocusRicambio: (ricambioId: string) => void;
  onDismissLocal: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Log modifiche magazzino" ariaLabel="Log modifiche magazzino">
      <div className={gestionaleLogDrawerPanelClass}>
        <div className={`${gestionaleLogScrollEmbeddedClass} min-h-0 min-w-0 flex-1`}>
          {loading && feed.length === 0 ? (
            <LoadingFormSkeleton fields={2} className="px-1 py-2" />
          ) : feed.length === 0 ? (
            <GestionaleLogEmpty message="Nessuna modifica registrata." />
          ) : (
            <ContentReveal data-testid="content-reveal">
              <GestionaleLogList>
                {pagedFeed.map((item) => (
                  <li key={item.id} className="list-none">
                    <GestionaleLogEntryFourLines
                      vm={item.vm}
                      onClick={() => onFocusRicambio(item.ricambioId)}
                      title="Mostra ricambio in tabella"
                      trailing={
                        item.source === "local" ? (
                          <GestionaleLogEntryDismissButton onDismiss={() => onDismissLocal(item.id)} />
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </GestionaleLogList>
            </ContentReveal>
          )}
        </div>
        {showPager ? (
          <TablePagination
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
            label={pagerLabel}
          />
        ) : null}
      </div>
    </Drawer>
  );
}
