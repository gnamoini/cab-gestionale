"use client";

import { useMemo } from "react";
import { HubModalPanoramicaPanel } from "@/components/design-system";
import { SchedaIngressoFormModalShell } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { useAuth } from "@/context/auth-context";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import {
  buildLavorazioneRowProfileResolver,
  displayLavorazioneAutore,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const clientPortalInfoBannerClass =
  "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2 text-xs text-[color:var(--cab-text-muted)]";

export function ClientLavorazioneIngressoDialog({
  open,
  onClose,
  row,
  schedeStore,
  addettiGlobali,
  addettiRecords = [],
}: {
  open: boolean;
  onClose: () => void;
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  addettiGlobali: readonly string[];
  addettiRecords?: readonly AddettoRecord[];
}) {
  const { user, authorName } = useAuth();
  const bundle = useMemo(() => getOrCreateBundle(schedeStore, row.id), [schedeStore, row.id]);
  const ingressoDoc = bundle.ingresso;
  const fields = useMemo(
    () => resolveClientPortalSchedaIngressoFields(row, schedeStore, addettiGlobali, addettiRecords),
    [ingressoDoc?.campi, row, schedeStore, addettiGlobali, addettiRecords],
  );

  const resolveSchedaAutoreUserId = useMemo(
    () => buildLavorazioneRowProfileResolver(row, user?.id ?? null, authorName),
    [row, user?.id, authorName],
  );

  const updatedByHint = useMemo(() => {
    if (!ingressoDoc) return null;
    const rawBy = ingressoDoc.updatedBy.trim();
    const autore = displayLavorazioneAutore(rawBy, "", resolveSchedaAutoreUserId);
    return `Ultimo aggiornamento: ${new Date(ingressoDoc.updatedAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })} · ${autore}`;
  }, [ingressoDoc, resolveSchedaAutoreUserId]);

  if (!open) return null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={onClose}
      variant="edit-scheda"
      modalSize="formSmall"
      footer={
        <div className="flex w-full min-w-0 justify-end">
          <button type="button" className={`${dsBtnNeutral} min-h-11 px-4`} onClick={onClose}>
            Chiudi
          </button>
        </div>
      }
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody>
          <HubModalPanoramicaPanel gapClass="gap-6">
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

            <SchedaIngressoPanoramicaView
              fields={fields}
              showAddettoAccettazione={false}
              showNoteIntervento={false}
              fieldLayout="rows"
              rowLayout="stacked"
            />

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
