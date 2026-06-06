"use client";

import { useMemo } from "react";
import { HubModalPanoramicaPanel } from "@/components/design-system";
import {
  SchedaIngressoFormModalShell,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function ClientLavorazioneIngressoDialog({
  open,
  onClose,
  row,
  schedeStore,
  logs,
  addettiGlobali,
}: {
  open: boolean;
  onClose: () => void;
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
}) {
  const bundle = useMemo(() => getOrCreateBundle(schedeStore, row.id), [schedeStore, row.id]);
  const ingressoDoc = bundle.ingresso;
  const fields = useMemo(
    () => resolveClientPortalSchedaIngressoFields(row, schedeStore, logs, addettiGlobali),
    [ingressoDoc?.campi, row, schedeStore, logs, addettiGlobali],
  );

  if (!open) return null;

  const updatedByHint = ingressoDoc
    ? `Ultimo aggiornamento: ${new Date(ingressoDoc.updatedAt).toLocaleString("it-IT")} · ${ingressoDoc.updatedBy}`
    : null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={onClose}
      variant="edit-scheda"
      modalSize="info"
      footer={null}
    >
      <div className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <GestionaleModalScrollBody>
          <HubModalPanoramicaPanel>
            {!ingressoDoc ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Scheda ingresso non ancora compilata in officina. I dati sotto riflettono le informazioni operative
                disponibili (mezzo e lavorazione).
              </p>
            ) : ingressoDoc.sorgente === "file_esterno" ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
                Scheda caricata da file esterno ({ingressoDoc.fileEsterno?.fileName ?? "documento"}). Consultazione
                metadati in sola lettura.
              </p>
            ) : null}

            <SchedaIngressoPanoramicaView fields={fields} showAddettoAccettazione={false} rowLayout="stacked" />

            {updatedByHint ? (
              <p className="border-t border-[color:var(--cab-border)] pt-3 text-[11px] leading-snug text-[color:var(--cab-text-muted)]">
                {updatedByHint}
              </p>
            ) : null}
          </HubModalPanoramicaPanel>
        </GestionaleModalScrollBody>
      </div>
    </SchedaIngressoFormModalShell>
  );
}
