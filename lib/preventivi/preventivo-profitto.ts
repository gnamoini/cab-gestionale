import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";
import { partitionRigheRicambi } from "@/lib/preventivi/preventivi-struttura";
import { calcolaTotaliPreventivo, totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import {
  resolvePreventivoRigaRicambioCostoUnitario,
} from "@/lib/preventivi/preventivo-ricambio-costo";
import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { LavorazioneSchedeBundle } from "@/types/schede";

export { costoUnitarioAcquistoRicambio } from "@/lib/preventivi/preventivo-ricambio-costo";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PreventivoMargineTier = "verde" | "giallo" | "rosso";

export type PreventivoProfittoDirezione = "utile" | "pareggio" | "perdita";

export type PreventivoLossReason = "manodopera" | "ricambi" | "entrambi" | null;

export type PreventivoProfittoCategoriaTotale = {
  ricavo: number;
  costo: number;
  profitto: number;
  margine: number | null;
};

export type PreventivoProfittoManodoperaBreakdown = {
  descrizione: string;
  orePreventivate: number;
  oreEffettive: number;
  costoOrarioInterno: number;
  costoReale: number;
  prezzoVenditaOrario: number;
  ricavo: number;
  profitto: number;
  margine: number | null;
  profittoNegativo: boolean;
  totale: PreventivoProfittoCategoriaTotale;
};

export type PreventivoProfittoRicambioRiga = {
  id: string;
  codice: string;
  descrizione: string;
  quantita: number;
  costoUnitario: number;
  costoTotale: number;
  prezzoVenditaUnitario: number;
  ricavo: number;
  profitto: number;
  margine: number | null;
  vendutoSottoCosto: boolean;
  profittoNegativo: boolean;
};

export type PreventivoProfittoRicambiBreakdown = {
  righe: PreventivoProfittoRicambioRiga[];
  totale: PreventivoProfittoCategoriaTotale;
};

export type PreventivoProfittoAltriCostiBreakdown = {
  totale: PreventivoProfittoCategoriaTotale;
  voci: readonly { id: string; descrizione: string }[];
  placeholder: true;
};

export type PreventivoProfittoFooterKpiRow = {
  id: string;
  label: string;
  value: string;
  rawValue?: number | null;
};

export type PreventivoProfittoResult = {
  summary: {
    ricavi: number;
    ricavoPreventivato: number;
    ricavoFinale: number;
    costi: number;
    profitto: number;
    margine: number | null;
    markup: number | null;
  };
  breakdown: {
    manodopera: PreventivoProfittoManodoperaBreakdown;
    ricambi: PreventivoProfittoRicambiBreakdown;
    altriCosti: PreventivoProfittoAltriCostiBreakdown;
  };
  indicatori: {
    margineTier: PreventivoMargineTier | null;
    profittoDirezione: PreventivoProfittoDirezione;
    warningCount: number;
    lossCount: number;
    lossReason: PreventivoLossReason;
  };
  timeline: {
    preventivato: number;
    costo: number;
    utile: number;
    margine: number | null;
  };
  confronto: {
    ore: { preventivato: number; reale: number; scostamento: number };
    ricambiQty: { preventivato: number; reale: number | null; scostamento: number | null };
  };
  kpi: {
    roiCommessa: number | null;
    costoMedioOra: number | null;
    prezzoMedioOra: number | null;
    ricaricoMedioRicambi: number | null;
    valoreMedioRicambio: number | null;
    costoMedioRicambio: number | null;
    ricavoMedioRicambio: number | null;
  };
  footerKpi: PreventivoProfittoFooterKpiRow[];
};

/** @deprecated Usare `PreventivoProfittoResult.summary` — slice tabella. */
export type PreventivoProfittoBreakdown = {
  ricavi: number;
  costiManodopera: number;
  costiRicambi: number;
  costi: number;
  profitto: number;
  marginePercent: number | null;
};

export function resolveMargineTier(margine: number | null): PreventivoMargineTier | null {
  if (margine == null || !Number.isFinite(margine)) return null;
  if (margine > 30) return "verde";
  if (margine >= 15) return "giallo";
  return "rosso";
}

export function resolveProfittoDirezione(profitto: number): PreventivoProfittoDirezione {
  if (profitto > 0) return "utile";
  if (profitto < 0) return "perdita";
  return "pareggio";
}

function margineRiga(profitto: number, ricavo: number): number | null {
  if (ricavo <= 0) return null;
  return round2((profitto / ricavo) * 100);
}

function categoriaTotale(ricavo: number, costo: number): PreventivoProfittoCategoriaTotale {
  const profitto = round2(ricavo - costo);
  return { ricavo: round2(ricavo), costo: round2(costo), profitto, margine: margineRiga(profitto, ricavo) };
}


export function oreEffettivePerCostoPreventivo(
  p: Pick<PreventivoRecord, "manodopera">,
  bundle: LavorazioneSchedeBundle | null | undefined,
): number {
  if (bundle) {
    const fromScheda = oreTotaliFromBundleLavorazioni(bundle);
    if (fromScheda !== null) return Math.max(0, fromScheda);
  }
  return Math.max(0, Number(p.manodopera?.oreTotali) || 0);
}

/** @deprecated Alias — usa oreEffettivePerCostoPreventivo */
export function oreLavoroPerCostoPreventivo(
  p: Pick<PreventivoRecord, "manodopera">,
  bundle: LavorazioneSchedeBundle | null | undefined,
): number {
  return oreEffettivePerCostoPreventivo(p, bundle);
}

function qtyRicambiScheda(bundle: LavorazioneSchedeBundle | null | undefined): number | null {
  const righe = bundle?.ricambi?.campi?.righe;
  if (!righe?.length) return null;
  let sum = 0;
  for (const r of righe) {
    const q = Number(r.quantita);
    if (Number.isFinite(q) && q > 0) sum += q;
  }
  return round2(sum);
}

function qtyRicambiPreventivo(righe: readonly PreventivoRigaRicambio[]): number {
  const { standard, materialiConsumo } = partitionRigheRicambi(righe);
  const all = materialiConsumo ? [...standard, materialiConsumo] : standard;
  let sum = 0;
  for (const r of all) {
    const q = Number(r.quantita);
    if (Number.isFinite(q) && q > 0) sum += q;
  }
  return round2(sum);
}

function buildRicambiBreakdown(
  righeRicambi: PreventivoRecord["righeRicambi"],
  magazzinoById: ReadonlyMap<string, RicambioMagazzino>,
): PreventivoProfittoRicambiBreakdown {
  const { standard, materialiConsumo } = partitionRigheRicambi(righeRicambi);
  const source = materialiConsumo ? [...standard, materialiConsumo] : standard;
  const righe: PreventivoProfittoRicambioRiga[] = [];
  let ricavoTot = 0;
  let costoTot = 0;

  for (const r of source) {
    const qty = Number.isFinite(r.quantita) && r.quantita > 0 ? r.quantita : 0;
    if (qty <= 0) continue;
    const id = r.ricambioId?.trim();
    const mag = id ? magazzinoById.get(id) : undefined;
    const costoUnit = resolvePreventivoRigaRicambioCostoUnitario(r, mag);
    const costoTotale = round2(qty * costoUnit);
    const ricavo = totaleNettoRigaRicambio(r);
    const profitto = round2(ricavo - costoTotale);
    const prezzoNettoUnit =
      qty > 0 ? round2(ricavo / qty) : Math.max(0, Number(r.prezzoUnitario) || 0);
    ricavoTot += ricavo;
    costoTot += costoTotale;
    righe.push({
      id: r.id,
      codice: r.codiceOE?.trim() || "—",
      descrizione: r.descrizione?.trim() || "—",
      quantita: qty,
      costoUnitario: costoUnit,
      costoTotale,
      prezzoVenditaUnitario: Math.max(0, Number(r.prezzoUnitario) || 0),
      ricavo,
      profitto,
      margine: margineRiga(profitto, ricavo),
      vendutoSottoCosto: costoUnit > 0 && prezzoNettoUnit < costoUnit,
      profittoNegativo: profitto < 0,
    });
  }

  return {
    righe,
    totale: categoriaTotale(ricavoTot, costoTot),
  };
}

function resolveLossReason(
  profittoGlobale: number,
  manodoperaProfitto: number,
  ricambiProfitto: number,
): PreventivoLossReason {
  if (profittoGlobale >= 0) return null;
  const manoLoss = manodoperaProfitto < 0;
  const ricLoss = ricambiProfitto < 0;
  if (manoLoss && ricLoss) return "entrambi";
  if (manoLoss) return "manodopera";
  if (ricLoss) return "ricambi";
  return null;
}

function buildFooterKpi(
  summary: PreventivoProfittoResult["summary"],
  confronto: PreventivoProfittoResult["confronto"],
): PreventivoProfittoFooterKpiRow[] {
  const fmtQty = (n: number | null) =>
    n == null ? "—" : n.toLocaleString("it-IT", { maximumFractionDigits: 2 });
  const fmtPct = (n: number | null) =>
    n == null ? "—" : `${n.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const fmtEur = (n: number) =>
    `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  return [
    { id: "ricavi", label: "Ricavi (preventivato)", value: fmtEur(summary.ricavoPreventivato), rawValue: summary.ricavoPreventivato },
    { id: "ricavi_finale", label: "Ricavi (finale)", value: fmtEur(summary.ricavoFinale), rawValue: summary.ricavoFinale },
    { id: "costi", label: "Costi", value: fmtEur(summary.costi), rawValue: summary.costi },
    { id: "profitto", label: "Profitto", value: fmtEur(summary.profitto), rawValue: summary.profitto },
    { id: "margine", label: "Margine", value: fmtPct(summary.margine), rawValue: summary.margine },
    { id: "markup", label: "Markup", value: fmtPct(summary.markup), rawValue: summary.markup },
    { id: "ore_prev", label: "Ore preventivate", value: fmtQty(confronto.ore.preventivato), rawValue: confronto.ore.preventivato },
    { id: "ore_reali", label: "Ore reali", value: fmtQty(confronto.ore.reale), rawValue: confronto.ore.reale },
    { id: "ore_scost", label: "Scostamento ore", value: fmtQty(confronto.ore.scostamento), rawValue: confronto.ore.scostamento },
    {
      id: "ricambi_prev",
      label: "Ricambi preventivati (qty)",
      value: fmtQty(confronto.ricambiQty.preventivato),
      rawValue: confronto.ricambiQty.preventivato,
    },
    {
      id: "ricambi_reali",
      label: "Ricambi utilizzati (qty)",
      value: fmtQty(confronto.ricambiQty.reale),
      rawValue: confronto.ricambiQty.reale,
    },
    {
      id: "ricambi_scost",
      label: "Scostamento ricambi (qty)",
      value: fmtQty(confronto.ricambiQty.scostamento),
      rawValue: confronto.ricambiQty.scostamento,
    },
  ];
}

export function profittoTabellaFromResult(result: PreventivoProfittoResult): {
  profitto: number;
  marginePercent: number | null;
} {
  return { profitto: result.summary.profitto, marginePercent: result.summary.margine };
}

/** SSOT — profitto, breakdown, indicatori, confronti e KPI.
 * Margine % = (Ricavi − Costi) / Ricavi × 100; Ricavi = 0 → null.
 * Ricavi globali (totaleFinale) includono sanificazione/collaudo/smaltimento senza costo allocato.
 */
export function computePreventivoProfitto(input: {
  preventivo: Pick<
    PreventivoRecord,
    | "totaleFinale"
    | "manodopera"
    | "righeRicambi"
    | "sanificazioneOre"
    | "sanificazionePrezzo"
    | "collaudoOre"
    | "collaudoPrezzo"
  >;
  bundle?: LavorazioneSchedeBundle | null;
  magazzinoById?: ReadonlyMap<string, RicambioMagazzino>;
}): PreventivoProfittoResult {
  const magazzinoById = input.magazzinoById ?? new Map<string, RicambioMagazzino>();
  const totals = calcolaTotaliPreventivo(input.preventivo);
  const ricavi = round2(Math.max(0, Number(input.preventivo.totaleFinale) || totals.totaleFinale || 0));

  const orePreventivate = Math.max(0, Number(input.preventivo.manodopera?.oreTotali) || 0);
  const oreEffettive = oreEffettivePerCostoPreventivo(input.preventivo, input.bundle);
  const costoOrarioInterno = Math.max(0, Number(input.preventivo.manodopera?.costoOrario) || 0);
  const prezzoVenditaOrario =
    Math.max(0, Number(input.preventivo.manodopera?.prezzoOrario) || 0) ||
    Math.max(0, Number(input.preventivo.manodopera?.costoOrario) || 0);
  const costoRealeManodopera = round2(oreEffettive * costoOrarioInterno);
  const ricavoManodopera = round2(totals.totaleManodopera);
  const profittoManodopera = round2(ricavoManodopera - costoRealeManodopera);
  const manodoperaTotale = categoriaTotale(ricavoManodopera, costoRealeManodopera);

  const ricambiBreakdown = buildRicambiBreakdown(input.preventivo.righeRicambi, magazzinoById);
  const costiAltri = 0;
  const costi = round2(costoRealeManodopera + ricambiBreakdown.totale.costo + costiAltri);
  const profitto = round2(ricavi - costi);
  const margine = margineRiga(profitto, ricavi);
  const markup = costi > 0 ? round2((profitto / costi) * 100) : null;

  const qtyPrev = qtyRicambiPreventivo(input.preventivo.righeRicambi);
  const qtyReale = qtyRicambiScheda(input.bundle);
  const scostamentoQty =
    qtyReale != null ? round2(qtyReale - qtyPrev) : null;

  let warningCount = 0;
  let lossCount = 0;
  for (const r of ricambiBreakdown.righe) {
    if (r.vendutoSottoCosto) warningCount += 1;
    if (r.profittoNegativo) lossCount += 1;
  }
  if (profittoManodopera < 0) lossCount += 1;

  const summary = {
    ricavi,
    ricavoPreventivato: ricavi,
    ricavoFinale: ricavi,
    costi,
    profitto,
    margine,
    markup,
  };

  const confronto = {
    ore: {
      preventivato: orePreventivate,
      reale: oreEffettive,
      scostamento: round2(oreEffettive - orePreventivate),
    },
    ricambiQty: {
      preventivato: qtyPrev,
      reale: qtyReale,
      scostamento: scostamentoQty,
    },
  };

  const result: PreventivoProfittoResult = {
    summary,
    breakdown: {
      manodopera: {
        descrizione: "Manodopera",
        orePreventivate,
        oreEffettive,
        costoOrarioInterno,
        costoReale: costoRealeManodopera,
        prezzoVenditaOrario,
        ricavo: ricavoManodopera,
        profitto: profittoManodopera,
        margine: margineRiga(profittoManodopera, ricavoManodopera),
        profittoNegativo: profittoManodopera < 0,
        totale: manodoperaTotale,
      },
      ricambi: ricambiBreakdown,
      altriCosti: {
        totale: categoriaTotale(0, 0),
        voci: [],
        placeholder: true,
      },
    },
    indicatori: {
      margineTier: resolveMargineTier(margine),
      profittoDirezione: resolveProfittoDirezione(profitto),
      warningCount,
      lossCount,
      lossReason: resolveLossReason(profitto, profittoManodopera, ricambiBreakdown.totale.profitto),
    },
    timeline: {
      preventivato: summary.ricavoPreventivato,
      costo: summary.costi,
      utile: summary.profitto,
      margine: summary.margine,
    },
    confronto,
    kpi: {
      roiCommessa: costi > 0 ? round2((profitto / costi) * 100) : null,
      costoMedioOra: oreEffettive > 0 ? round2(costoRealeManodopera / oreEffettive) : null,
      prezzoMedioOra: orePreventivate > 0 ? round2(ricavoManodopera / orePreventivate) : null,
      ricaricoMedioRicambi:
        ricambiBreakdown.totale.costo > 0
          ? round2(
              ((ricambiBreakdown.totale.ricavo - ricambiBreakdown.totale.costo) /
                ricambiBreakdown.totale.costo) *
                100,
            )
          : null,
      valoreMedioRicambio:
        qtyPrev > 0 ? round2(ricambiBreakdown.totale.ricavo / qtyPrev) : null,
      costoMedioRicambio:
        qtyPrev > 0 ? round2(ricambiBreakdown.totale.costo / qtyPrev) : null,
      ricavoMedioRicambio:
        qtyPrev > 0 ? round2(ricambiBreakdown.totale.ricavo / qtyPrev) : null,
    },
    footerKpi: [],
  };

  result.footerKpi = buildFooterKpi(summary, confronto);
  return result;
}

/** Slice legacy per compat — preferire `profittoTabellaFromResult`. */
export function profittoBreakdownFromResult(result: PreventivoProfittoResult): PreventivoProfittoBreakdown {
  return {
    ricavi: result.summary.ricavi,
    costiManodopera: result.breakdown.manodopera.totale.costo,
    costiRicambi: result.breakdown.ricambi.totale.costo,
    costi: result.summary.costi,
    profitto: result.summary.profitto,
    marginePercent: result.summary.margine,
  };
}

/** @deprecated Usare costoRicambi da breakdown — mantiene export per test esterni. */
export function costoRicambiPreventivo(
  p: Pick<PreventivoRecord, "righeRicambi">,
  magazzinoById: ReadonlyMap<string, RicambioMagazzino>,
): number {
  return buildRicambiBreakdown(p.righeRicambi, magazzinoById).totale.costo;
}

/** KPI footer editor manodopera — stessa logica di computePreventivoProfitto. */
export function computePreventivoEditorManodoperaKpi(input: {
  preventivo: Pick<PreventivoRecord, "manodopera">;
  bundle?: LavorazioneSchedeBundle | null;
  ricavoManodopera: number;
}): { costo: number; margine: number; marginePercent: number | null } {
  const ore = oreEffettivePerCostoPreventivo(input.preventivo, input.bundle);
  const costoOrario = Math.max(0, Number(input.preventivo.manodopera?.costoOrario) || 0);
  const costo = round2(ore * costoOrario);
  const margine = round2(input.ricavoManodopera - costo);
  const marginePercent =
    input.ricavoManodopera > 0 ? round2((margine / input.ricavoManodopera) * 100) : null;
  return { costo, margine, marginePercent };
}

export function magazzinoMapFromList(items: readonly RicambioMagazzino[]): Map<string, RicambioMagazzino> {
  const map = new Map<string, RicambioMagazzino>();
  for (const item of items) map.set(item.id, item);
  return map;
}
