"use client";

import { useMemo } from "react";
import { HubModalPanoramicaPanel } from "@/components/design-system";
import { SchedaIngressoFormModalShell } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import {
  formatLavorazioneUltimaModificaMobileLines,
  resolveLavorazioneUltimaModifica,
} from "@/lib/lavorazioni/lavorazione-ultima-modifica";
import { getOrCreateBundle } from "@/lib/schede/lavorazioni-schede-storage";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

function ClientPortalIngressoUltimoAggiornamento({
  row,
  bundle,
  autoreLog,
  resolveUserId,
}: {
  row: LavorazioneListRow;
  bundle: ReturnType<typeof getOrCreateBundle>;
  autoreLog: string;
  resolveUserId: (userId: string) => string | undefined;
}) {
  const info = useMemo(
    () =>
      resolveLavorazioneUltimaModifica(row, bundle, {
        resolveUserId,
        autoreLog,
        omitUnresolvedAutore: true,
      }),
    [autoreLog, bundle, resolveUserId, row],
  );
  const { dateTime, autore } = formatLavorazioneUltimaModificaMobileLines(info);
  if (!dateTime || dateTime === "—") return null;

  return (
    <footer className="border-t border-[color:var(--cab-border)] pt-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        Ultimo aggiornamento
      </p>
      <p className="mt-1 break-words text-xs font-medium tabular-nums text-[color:var(--cab-text)]">{dateTime}</p>
      {autore && autore !== "—" ? (
        <p className="mt-0.5 break-words text-xs font-medium text-[color:var(--cab-text)]">{autore}</p>
      ) : null}
    </footer>
  );
}

export function ClientLavorazioneIngressoDialog({
  open,
  onClose,
  row,
  schedeStore,
  addettiGlobali,
  addettiRecords = [],
  autoreLog = "",
  resolveUserId,
}: {
  open: boolean;
  onClose: () => void;
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  addettiGlobali: readonly string[];
  addettiRecords?: readonly AddettoRecord[];
  autoreLog?: string;
  resolveUserId: (userId: string) => string | undefined;
}) {
  const bundle = useMemo(() => getOrCreateBundle(schedeStore, row.id), [schedeStore, row.id]);
  const fields = useMemo(
    () => resolveClientPortalSchedaIngressoFields(row, schedeStore, addettiGlobali, addettiRecords),
    [bundle.ingresso?.campi, row, schedeStore, addettiGlobali, addettiRecords],
  );

  if (!open) return null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={onClose}
      variant="edit-scheda"
      modalSize="formSmall"
      modalHeight="standard"
    >
      <div className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}>
        <GestionaleModalScrollBody>
          <HubModalPanoramicaPanel gapClass="gap-6">
            <SchedaIngressoPanoramicaView
              fields={fields}
              showAddettoAccettazione={false}
              showNoteIntervento
              fieldLayout="rows"
              rowLayout="stacked"
              portalIngressoLayout
            />
            <ClientPortalIngressoUltimoAggiornamento
              row={row}
              bundle={bundle}
              autoreLog={autoreLog}
              resolveUserId={resolveUserId}
            />
          </HubModalPanoramicaPanel>
        </GestionaleModalScrollBody>
      </div>
    </SchedaIngressoFormModalShell>
  );
}
