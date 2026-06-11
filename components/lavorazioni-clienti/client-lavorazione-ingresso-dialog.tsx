"use client";

import { useMemo } from "react";
import { HubModalPanoramicaPanel } from "@/components/design-system";
import { SchedaIngressoFormModalShell } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

const clientPortalInfoBannerClass =
  "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2 text-xs text-[color:var(--cab-text-muted)]";

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
      subtitle="Scheda di accettazione mezzo — sola lettura."
      footer={
        <button type="button" className={`${dsBtnNeutral} min-h-11 w-full sm:ml-auto sm:w-auto`} onClick={onClose}>
          Chiudi
        </button>
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody>
          <HubModalPanoramicaPanel>
            {!ingressoDoc ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                Scheda ingresso non ancora compilata in officina. I dati sotto riflettono le informazioni operative
                disponibili (mezzo e lavorazione).
              </p>
            ) : ingressoDoc.sorgente === "file_esterno" ? (
              <p className={clientPortalInfoBannerClass}>
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
