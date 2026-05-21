import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { MagazzinoRicambioRow, MovimentoRicambioRow } from "@/src/types/supabase-tables";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";

export type LavorazioneCostoBreakdown = {
  oreTotali: number;
  costoOrario: number;
  manodoperaTotale: number;
  ricambiTotale: number;
  costoTotale: number;
  righeRicambi: number;
  fonteOre: "scheda_lavorazioni" | "scheda_ingresso" | "nessuna";
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseOreIngresso(raw: string | undefined): number {
  const t = raw?.trim().replace(",", ".") ?? "";
  if (!t) return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? round2(n) : 0;
}

export function oreTotaliForCost(bundle: LavorazioneSchedeBundle): { ore: number; fonte: LavorazioneCostoBreakdown["fonteOre"] } {
  const fromLav = oreTotaliFromBundleLavorazioni(bundle);
  if (fromLav !== null && fromLav > 0) {
    return { ore: fromLav, fonte: "scheda_lavorazioni" };
  }
  const fromIng = parseOreIngresso(bundle.ingresso?.campi.oreLavoro);
  if (fromIng > 0) {
    return { ore: fromIng, fonte: "scheda_ingresso" };
  }
  if (fromLav !== null) return { ore: 0, fonte: "scheda_lavorazioni" };
  return { ore: 0, fonte: "nessuna" };
}

function costoUnitarioAcquisto(row: MagazzinoRicambioRow | undefined): number {
  const c = row?.costo;
  return typeof c === "number" && Number.isFinite(c) && c >= 0 ? c : 0;
}

/** Ricambi da scheda ricambi (fonte primaria). */
function ricambiTotaleDaScheda(
  bundle: LavorazioneSchedeBundle,
  magazzinoById: ReadonlyMap<string, MagazzinoRicambioRow>,
): { totale: number; righe: number } {
  const righe = bundle.ricambi?.campi.righe ?? [];
  let totale = 0;
  let count = 0;
  for (const r of righe) {
    const qty = Number.isFinite(r.quantita) && r.quantita > 0 ? r.quantita : 0;
    if (qty <= 0) continue;
    const id = r.ricambioId?.trim();
    if (!id) continue;
    totale += qty * costoUnitarioAcquisto(magazzinoById.get(id));
    count += 1;
  }
  return { totale: round2(totale), righe: count };
}

/** Fallback: movimenti uscita collegati alla lavorazione. */
function ricambiTotaleDaMovimenti(
  movimenti: readonly MovimentoRicambioRow[],
  magazzinoById: ReadonlyMap<string, MagazzinoRicambioRow>,
): number {
  let totale = 0;
  for (const m of movimenti) {
    if (m.tipo !== "uscita") continue;
    const qty = Number.isFinite(m.quantita) && m.quantita > 0 ? m.quantita : 0;
    if (qty <= 0) continue;
    totale += qty * costoUnitarioAcquisto(magazzinoById.get(m.ricambio_id));
  }
  return round2(totale);
}

export function computeLavorazioneCosto(input: {
  bundle: LavorazioneSchedeBundle;
  costoOrario: number;
  magazzinoById: ReadonlyMap<string, MagazzinoRicambioRow>;
  movimentiUscita?: readonly MovimentoRicambioRow[];
}): LavorazioneCostoBreakdown {
  const hourly = Number.isFinite(input.costoOrario) && input.costoOrario > 0 ? input.costoOrario : 0;
  const { ore, fonte } = oreTotaliForCost(input.bundle);
  const manodoperaTotale = round2(ore * hourly);

  const daScheda = ricambiTotaleDaScheda(input.bundle, input.magazzinoById);
  let ricambiTotale = daScheda.totale;
  let righeRicambi = daScheda.righe;
  if (ricambiTotale <= 0 && (input.movimentiUscita?.length ?? 0) > 0) {
    ricambiTotale = ricambiTotaleDaMovimenti(input.movimentiUscita ?? [], input.magazzinoById);
    righeRicambi = input.movimentiUscita?.filter((m) => m.tipo === "uscita").length ?? 0;
  }

  return {
    oreTotali: ore,
    costoOrario: hourly,
    manodoperaTotale,
    ricambiTotale,
    costoTotale: round2(manodoperaTotale + ricambiTotale),
    righeRicambi,
    fonteOre: fonte,
  };
}

export function formatLavorazioneCostoEuro(amount: number): string {
  return amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
