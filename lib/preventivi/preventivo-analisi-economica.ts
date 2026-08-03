import type {
  PreventivoProfittoResult,
  PreventivoMargineTier,
  PreventivoProfittoDirezione,
  PreventivoLossReason,
} from "@/lib/preventivi/preventivo-profitto";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";

export const PREVENTIVO_ANALISI_ECONOMICA_VERSION = "1";

export type PreventivoAnalisiEconomicaMetadata = {
  generatedAt: string;
  generatedBy: string;
  version: string;
};

export type PreventivoAnalisiEconomicaHeader = {
  numeroPreventivo: string;
  cliente: string;
  mezzo: string;
  statoPreventivo: PreventivoStato;
  dataCreazione: string;
  lavorazioneCodice: string | null;
  lavorazioneStato: string | null;
  oreLavorazione: number;
  importoCliente: number;
  totaleCosti: number;
  profitto: number;
  margine: number | null;
};

export type PreventivoAnalisiCategoriaVoce = {
  id: string;
  label: string;
  ricavo: number;
  costo: number;
  profitto: number;
  margine: number | null;
};

export type PreventivoAnalisiEconomicaApiResponse = {
  metadata: PreventivoAnalisiEconomicaMetadata;
  header: PreventivoAnalisiEconomicaHeader;
  summary: PreventivoProfittoResult["summary"];
  breakdown: PreventivoProfittoResult["breakdown"];
  indicatori: PreventivoProfittoResult["indicatori"];
  timeline: PreventivoProfittoResult["timeline"];
  confronto: PreventivoProfittoResult["confronto"];
  kpi: PreventivoProfittoResult["kpi"];
  footerKpi: PreventivoProfittoResult["footerKpi"];
  costiPerCategoria: PreventivoAnalisiCategoriaVoce[];
  ricaviPerCategoria: PreventivoAnalisiCategoriaVoce[];
};

export type PreventivoAnalisiEconomicaMetaInput = {
  preventivo: Pick<
    PreventivoRecord,
    | "numero"
    | "cliente"
    | "macchinaRiassunto"
    | "stato"
    | "dataCreazione"
    | "lavorazioneId"
  >;
  lavorazioneCodice?: string | null;
  lavorazioneStato?: string | null;
};

function categoriaVoce(
  id: string,
  label: string,
  totale: { ricavo: number; costo: number; profitto: number; margine: number | null },
): PreventivoAnalisiCategoriaVoce {
  return {
    id,
    label,
    ricavo: totale.ricavo,
    costo: totale.costo,
    profitto: totale.profitto,
    margine: totale.margine,
  };
}

/** Solo mapping/presentazione — zero ricalcolo economico. */
export function buildPreventivoAnalisiEconomicaReport(input: {
  preventivoMeta: PreventivoAnalisiEconomicaMetaInput;
  profittoResult: PreventivoProfittoResult;
  metadata: PreventivoAnalisiEconomicaMetadata;
}): PreventivoAnalisiEconomicaApiResponse {
  const { preventivoMeta, profittoResult, metadata } = input;
  const p = preventivoMeta.preventivo;
  const { summary, breakdown, indicatori, timeline, confronto, kpi, footerKpi } = profittoResult;

  const header: PreventivoAnalisiEconomicaHeader = {
    numeroPreventivo: p.numero?.trim() || "—",
    cliente: p.cliente?.trim() || "—",
    mezzo: p.macchinaRiassunto?.trim() || "—",
    statoPreventivo: p.stato,
    dataCreazione: p.dataCreazione,
    lavorazioneCodice: preventivoMeta.lavorazioneCodice?.trim() || null,
    lavorazioneStato: preventivoMeta.lavorazioneStato?.trim() || null,
    oreLavorazione: confronto.ore.reale,
    importoCliente: summary.ricavoFinale,
    totaleCosti: summary.costi,
    profitto: summary.profitto,
    margine: summary.margine,
  };

  const costiPerCategoria: PreventivoAnalisiCategoriaVoce[] = [
    categoriaVoce("manodopera", "Manodopera", breakdown.manodopera.totale),
    categoriaVoce("ricambi", "Ricambi", breakdown.ricambi.totale),
    categoriaVoce("altri_costi", "Altri costi", breakdown.altriCosti.totale),
  ];

  const ricaviPerCategoria: PreventivoAnalisiCategoriaVoce[] = [
    categoriaVoce("manodopera", "Manodopera", breakdown.manodopera.totale),
    categoriaVoce("ricambi", "Ricambi", breakdown.ricambi.totale),
  ];

  return {
    metadata,
    header,
    summary,
    breakdown,
    indicatori,
    timeline,
    confronto,
    kpi,
    footerKpi,
    costiPerCategoria,
    ricaviPerCategoria,
  };
}

export type { PreventivoMargineTier, PreventivoProfittoDirezione, PreventivoLossReason };

export function lossReasonLabel(reason: PreventivoLossReason): string | null {
  switch (reason) {
    case "manodopera":
      return "Perdita dovuta alla manodopera";
    case "ricambi":
      return "Perdita dovuta ai ricambi";
    case "entrambi":
      return "Perdita dovuta a manodopera e ricambi";
    default:
      return null;
  }
}

export function margineTierClass(tier: PreventivoMargineTier | null): string {
  switch (tier) {
    case "verde":
      return "text-emerald-600 dark:text-emerald-400";
    case "giallo":
      return "text-amber-600 dark:text-amber-400";
    case "rosso":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-[color:var(--cab-text-muted)]";
  }
}

export function profittoDirezioneLabel(dir: PreventivoProfittoDirezione): string {
  switch (dir) {
    case "utile":
      return "Utile";
    case "perdita":
      return "Perdita";
    default:
      return "Pareggio";
  }
}
