import { totaleCollaudoPreventivo, totaleSanificazionePreventivo } from "@/lib/preventivi/preventivi-collaudo";
import { partitionRigheRicambi } from "@/lib/preventivi/preventivi-struttura";
import { PREVENTIVO_SMALTIMENTO_PERCENT } from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoRecord, PreventivoRigaRicambio } from "@/lib/preventivi/types";

export { normalizeCollaudoOre, normalizeSanificazioneOre, totaleCollaudoPreventivo, totaleSanificazionePreventivo } from "@/lib/preventivi/preventivi-collaudo";

export function totaleNettoRigaRicambio(r: Pick<PreventivoRigaRicambio, "quantita" | "prezzoUnitario" | "scontoPercent">): number {
  const gross = r.quantita * r.prezzoUnitario;
  const sp = Math.min(100, Math.max(0, r.scontoPercent ?? 0));
  return Math.round(gross * (1 - sp / 100) * 100) / 100;
}

export function calcolaTotaliPreventivo(
  p: Pick<
    PreventivoRecord,
    "righeRicambi" | "manodopera" | "sanificazioneOre" | "sanificazionePrezzo" | "collaudoOre" | "collaudoPrezzo"
  >,
): {
  totaleRicambi: number;
  totaleManodopera: number;
  totaleSmaltimento: number;
  totaleFinale: number;
} {
  const { standard, materialiConsumo } = partitionRigheRicambi(p.righeRicambi);
  const totaleRicambiStandard = Math.round(standard.reduce((s, r) => s + totaleNettoRigaRicambio(r), 0) * 100) / 100;
  const totaleMateriali = materialiConsumo ? totaleNettoRigaRicambio(materialiConsumo) : 0;
  const totaleRicambi = Math.round((totaleRicambiStandard + totaleMateriali) * 100) / 100;

  const prezzoOrario =
    Math.max(0, Number(p.manodopera.prezzoOrario) || 0) ||
    Math.max(0, Number(p.manodopera.costoOrario) || 0);
  const lordoMan = p.manodopera.oreTotali * prezzoOrario;
  const spM = Math.min(100, Math.max(0, p.manodopera.scontoPercent ?? 0));
  const totaleManodopera = Math.round(lordoMan * (1 - spM / 100) * 100) / 100;

  const sanificazione = totaleSanificazionePreventivo(p);
  const collaudo = totaleCollaudoPreventivo(p);

  const nettoSenzaSmaltimento = Math.round((sanificazione + totaleManodopera + collaudo + totaleRicambi) * 100) / 100;
  const totaleSmaltimento = Math.round(nettoSenzaSmaltimento * (PREVENTIVO_SMALTIMENTO_PERCENT / 100) * 100) / 100;
  const totaleFinale = Math.round((nettoSenzaSmaltimento + totaleSmaltimento) * 100) / 100;

  return { totaleRicambi, totaleManodopera, totaleSmaltimento, totaleFinale };
}
