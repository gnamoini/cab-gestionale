"use client";

import { useMemo } from "react";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function ClientLavorazioneInformazioniPanel({
  row,
  schedeStore,
  addettiGlobali,
  addettiRecords = [],
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  addettiGlobali: readonly string[];
  addettiRecords?: readonly AddettoRecord[];
}) {
  const fields = useMemo(
    () => resolveClientPortalSchedaIngressoFields(row, schedeStore, addettiGlobali, addettiRecords),
    [row, schedeStore, addettiGlobali, addettiRecords],
  );

  return (
    <section aria-label="Dettaglio scheda ingresso" className="flex min-w-0 flex-col gap-3">
      <SchedaIngressoPanoramicaView
        fields={fields}
        showAddettoAccettazione={false}
        showNoteIntervento={false}
        omitPanoramaDuplicates
        densePanorama
        portalMezzoSplit
        fieldLayout="rows"
        rowLayout="stacked"
      />
    </section>
  );
}
