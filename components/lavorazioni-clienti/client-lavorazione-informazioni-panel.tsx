"use client";

import { useMemo } from "react";
import { SchedaIngressoPanoramicaView } from "@/components/gestionale/lavorazioni/scheda-ingresso-panoramica-view";
import { resolveClientPortalSchedaIngressoFields } from "@/lib/lavorazioni/client-portal-timeline";
import { dsGapMd } from "@/lib/ui/design-system";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";

export function ClientLavorazioneInformazioniPanel({
  row,
  schedeStore,
  logs,
  addettiGlobali,
}: {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  logs: readonly LogModificaRow[];
  addettiGlobali: readonly string[];
}) {
  const fields = useMemo(
    () => resolveClientPortalSchedaIngressoFields(row, schedeStore, logs, addettiGlobali),
    [row, schedeStore, logs, addettiGlobali],
  );

  return (
    <section aria-label="Scheda ingresso" className={`flex min-w-0 flex-col ${dsGapMd}`}>
      <SchedaIngressoPanoramicaView fields={fields} showAddettoAccettazione={false} rowLayout="stacked" />
    </section>
  );
}
