import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import { collectOperatorNamesFromBundle, resolveOperatorIdentity } from "@/lib/report/recidivita/resolve-operator-identity";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { LavorazioneDocumentRow, MovimentoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export type PreventivoEpisodioSummary = {
  id: string;
  numero: string;
  stato: PreventivoStato;
  statoLabel: string;
  totaleFinale: number;
};

export type MezzoInterventoDetail = {
  intervento: MezzoInterventoLavorazione;
  bundle: LavorazioneSchedeBundle | null;
  oreTotali: number | null;
  ricambiCount: number;
  operatori: string[];
  preventivo: PreventivoEpisodioSummary | null;
  preventivoPrecedente: PreventivoEpisodioSummary | null;
  movimenti: MovimentoRicambioRow[];
  documenti: LavorazioneDocumentRow[];
  weakMezzoLink: boolean;
};

const PREVENTIVO_LABEL: Record<PreventivoStato, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  approvato: "Approvato",
  rifiutato: "Rifiutato",
  convertito: "Convertito",
};

function toPreventivoSummary(p: PreventivoRecord): PreventivoEpisodioSummary {
  return {
    id: p.id,
    numero: p.numero,
    stato: p.stato,
    statoLabel: PREVENTIVO_LABEL[p.stato] ?? p.stato,
    totaleFinale: p.totaleFinale,
  };
}

export function resolveOperatorePrincipale(
  bundle: LavorazioneSchedeBundle | null,
  addettiRecords: readonly AddettoRecord[],
): string | null {
  if (!bundle) return null;
  const acc = bundle.ingresso?.campi.addettoAccettazione?.trim();
  if (acc) return resolveOperatorIdentity(acc, addettiRecords).storedName;

  let best: { name: string; ore: number } | null = null;
  for (const r of bundle.lavorazioni?.campi.righe ?? []) {
    for (const a of r.addettiAssegnati ?? []) {
      const ore = a.oreImpiegate ?? 0;
      if (!best || ore > best.ore) best = { name: a.addetto, ore };
    }
  }
  return best?.name?.trim() || null;
}

export function buildInterventoDetailFromBundle(input: {
  intervento: MezzoInterventoLavorazione;
  bundle: LavorazioneSchedeBundle | null;
  movimenti: readonly MovimentoRicambioRow[];
  documenti?: readonly LavorazioneDocumentRow[];
  preventivi?: readonly PreventivoRecord[];
  prevInterventoId?: string | null;
  weakMezzoLink?: boolean;
  addettiRecords?: readonly AddettoRecord[];
}): MezzoInterventoDetail {
  const {
    intervento,
    bundle,
    movimenti,
    documenti = [],
    preventivi = [],
    prevInterventoId,
    weakMezzoLink = false,
    addettiRecords = [],
  } = input;

  const lavMov = movimenti.filter((m) => m.lavorazione_id === intervento.id);
  const lavPrev = preventivi.filter((p) => p.lavorazioneId === intervento.id);
  const prevPrev = prevInterventoId
    ? preventivi.find((p) => p.lavorazioneId === prevInterventoId)
    : null;

  const operatori = collectOperatorNamesFromBundle(bundle).map(
    (n) => resolveOperatorIdentity(n, addettiRecords).storedName,
  );

  return {
    intervento,
    bundle,
    oreTotali: bundle ? oreTotaliFromBundleLavorazioni(bundle) : null,
    ricambiCount: bundle?.ricambi?.campi.righe?.length ?? 0,
    operatori,
    preventivo: lavPrev[0] ? toPreventivoSummary(lavPrev[0]) : null,
    preventivoPrecedente: prevPrev ? toPreventivoSummary(prevPrev) : null,
    movimenti: lavMov,
    documenti: [...documenti],
    weakMezzoLink,
  };
}
