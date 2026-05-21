import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { oreTotaliFromBundleLavorazioni } from "@/lib/lavorazioni/ore-totali-scheda";

export type LavorazioneCostoBreakdown = {
  oreTotali: number;
  costoOrario: number;
  manodoperaTotale: number;
  ricambiTotale: number;
  costoTotale: number;
  righeRicambi: number;
  fonteOre: "scheda_lavorazioni" | "nessuna";
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Solo ore dalla scheda lavorazioni (addetti × ore impiegate). */
export function oreTotaliForCost(bundle: LavorazioneSchedeBundle): { ore: number; fonte: LavorazioneCostoBreakdown["fonteOre"] } {
  const fromLav = oreTotaliFromBundleLavorazioni(bundle);
  if (fromLav !== null) {
    return { ore: fromLav > 0 ? fromLav : 0, fonte: "scheda_lavorazioni" };
  }
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

export function computeLavorazioneCosto(input: {
  bundle: LavorazioneSchedeBundle;
  costoOrario: number;
  magazzinoById: ReadonlyMap<string, MagazzinoRicambioRow>;
}): LavorazioneCostoBreakdown {
  const hourly = Number.isFinite(input.costoOrario) && input.costoOrario > 0 ? input.costoOrario : 0;
  const { ore, fonte } = oreTotaliForCost(input.bundle);
  const manodoperaTotale = round2(ore * hourly);

  const daScheda = ricambiTotaleDaScheda(input.bundle, input.magazzinoById);

  return {
    oreTotali: ore,
    costoOrario: hourly,
    manodoperaTotale,
    ricambiTotale: daScheda.totale,
    costoTotale: round2(manodoperaTotale + daScheda.totale),
    righeRicambi: daScheda.righe,
    fonteOre: fonte,
  };
}

export function formatLavorazioneCostoEuro(amount: number): string {
  return amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
