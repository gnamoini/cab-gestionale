import type { MutableRefObject } from "react";
import { clientPaginationPageForIndex } from "@/lib/ui/use-client-pagination";

export type RevealRicambioInTableOpts = {
  ricambioId: string;
  filteredSortedRef: MutableRefObject<{ id: string }[]>;
  listPageSizeRef: MutableRefObject<number>;
  setMagazzinoPage: (page: number) => void;
  flashRow: (id: string, opts?: { durationMs?: number }) => void;
  closeOverlays?: () => void;
  flashMs?: number;
};

/** Dopo salvataggio: chiude overlay, imposta pagina e scroll sulla riga senza resettare filtri. */
export function revealRicambioInTableAfterSave(opts: RevealRicambioInTableOpts): boolean {
  opts.closeOverlays?.();

  const rows = opts.filteredSortedRef.current;
  const ps = Math.max(1, opts.listPageSizeRef.current);
  const idx = rows.findIndex((p) => p.id === opts.ricambioId);
  const inView = idx >= 0;

  if (inView) {
    opts.setMagazzinoPage(clientPaginationPageForIndex(idx, ps));
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        opts.flashRow(opts.ricambioId, { durationMs: opts.flashMs ?? 1400 });
        if (inView) {
          window.setTimeout(() => {
            document.getElementById(`magazzino-row-${opts.ricambioId}`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }, 60);
        }
      }, 0);
    });
  });

  return inView;
}
