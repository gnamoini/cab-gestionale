import {
  isDescrizioneCollaudo,
  isDescrizioneMaterialiConsumo,
  isDescrizioneSanificazione,
  isDescrizioneSmaltimento,
  PREVENTIVO_COLLAUDO_DESCRIZIONE,
  PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
  PREVENTIVO_RIGA_MATERIALI_ID,
  PREVENTIVO_SANIFICAZIONE_DESCRIZIONE,
} from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoRecord, PreventivoRigaRicambio, PreventivoRigaRicambioTipo } from "@/lib/preventivi/types";

function nextRigaId(): string {
  return `prr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function tipoRigaRicambio(r: PreventivoRigaRicambio): PreventivoRigaRicambioTipo {
  if (r.tipo === "materiali_consumo") return "materiali_consumo";
  if (r.tipo === "standard") return "standard";
  if (isDescrizioneMaterialiConsumo(r.descrizione) || r.id === PREVENTIVO_RIGA_MATERIALI_ID) {
    return "materiali_consumo";
  }
  if (isDescrizioneSmaltimento(r.descrizione)) return "standard";
  return "standard";
}

export function partitionRigheRicambi(righe: readonly PreventivoRigaRicambio[]): {
  standard: PreventivoRigaRicambio[];
  materialiConsumo: PreventivoRigaRicambio | null;
} {
  const standard: PreventivoRigaRicambio[] = [];
  let materialiConsumo: PreventivoRigaRicambio | null = null;
  for (const r of righe) {
    if (isDescrizioneSmaltimento(r.descrizione)) continue;
    const tipo = tipoRigaRicambio(r);
    if (tipo === "materiali_consumo") {
      if (!materialiConsumo) {
        materialiConsumo = {
          ...r,
          id: r.id || PREVENTIVO_RIGA_MATERIALI_ID,
          tipo: "materiali_consumo",
          descrizione: PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
          quantita: 1,
          codiceOE: r.codiceOE?.trim() || "MAT-CONS",
        };
      }
      continue;
    }
    standard.push({ ...r, tipo: "standard" });
  }
  return { standard, materialiConsumo };
}

/** Rimuove voci strutturali duplicate dal testo lavorazioni (sanificazione, collaudo). */
export function pulisciDescrizioneLavorazioniSpecifiche(testo: string): string {
  const lines = testo
    .split(/\n+/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  const kept = lines.filter((l) => {
    if (isDescrizioneSanificazione(l)) return false;
    if (isDescrizioneCollaudo(l)) return false;
    if (isDescrizioneSmaltimento(l)) return false;
    if (isDescrizioneMaterialiConsumo(l)) return false;
    return true;
  });
  return kept.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
}

function createRigaMaterialiConsumo(prezzo: number): PreventivoRigaRicambio {
  return {
    id: PREVENTIVO_RIGA_MATERIALI_ID,
    ricambioId: null,
    codiceOE: "MAT-CONS",
    descrizione: PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
    quantita: 1,
    prezzoUnitario: Math.max(0, Math.round(prezzo * 100) / 100),
    scontoPercent: 0,
    tipo: "materiali_consumo",
  };
}

/** Garantisce campi e righe coerenti con la struttura standard (idempotente). */
export function ensurePreventivoStruttura(p: PreventivoRecord): PreventivoRecord {
  const sanificazionePrezzo = 0;
  const collaudoPrezzo = Math.max(0, Number(p.collaudoPrezzo) || 0);

  const { standard, materialiConsumo } = partitionRigheRicambi(p.righeRicambi);
  let materiali = materialiConsumo;
  if (!materiali) {
    materiali = createRigaMaterialiConsumo(0);
  } else {
    materiali = {
      ...materiali,
      quantita: 1,
      tipo: "materiali_consumo",
      descrizione: PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
    };
  }

  const descrizioneLavorazioniCliente = pulisciDescrizioneLavorazioniSpecifiche(p.descrizioneLavorazioniCliente);

  return {
    ...p,
    sanificazionePrezzo,
    collaudoPrezzo,
    descrizioneLavorazioniCliente,
    righeRicambi: [...standard, materiali],
  };
}

export function ensureMaterialiConsumoRiga(
  righe: readonly PreventivoRigaRicambio[],
  prezzo: number,
): PreventivoRigaRicambio[] {
  const { standard } = partitionRigheRicambi(righe);
  return [...standard, createRigaMaterialiConsumo(prezzo)];
}

export function parseLavorazioniSpecificheLines(testo: string): string[] {
  return testo
    .split(/\n+/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter((l) => l.length > 0 && !isDescrizioneSanificazione(l) && !isDescrizioneCollaudo(l));
}

export type PreventivoRigaOutput =
  | { sezione: "lavorazioni"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number; locked?: boolean }
  | { sezione: "manodopera"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number }
  | { sezione: "collaudo"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number }
  | { sezione: "ricambi"; ordine: number; riga: PreventivoRigaRicambio };

/** Ordine fisso per PDF, report e riepiloghi. */
export function buildPreventivoOutputRighe(p: PreventivoRecord): PreventivoRigaOutput[] {
  const base = ensurePreventivoStruttura(p);
  const out: PreventivoRigaOutput[] = [];
  let ordine = 1;

  const sanPrezzo = Math.max(0, base.sanificazionePrezzo ?? 0);
  out.push({
    sezione: "lavorazioni",
    ordine: ordine++,
    descrizione: PREVENTIVO_SANIFICAZIONE_DESCRIZIONE,
    quantita: 1,
    prezzoUnitario: sanPrezzo,
    totale: sanPrezzo,
    locked: true,
  });

  for (const line of parseLavorazioniSpecificheLines(base.descrizioneLavorazioniCliente)) {
    out.push({
      sezione: "lavorazioni",
      ordine: ordine++,
      descrizione: line,
      quantita: 1,
      prezzoUnitario: 0,
      totale: 0,
    });
  }

  const ore = Math.max(0, base.manodopera.oreTotali);
  const costoOr = Math.max(0, base.manodopera.costoOrario);
  const spM = Math.min(100, Math.max(0, base.manodopera.scontoPercent ?? 0));
  const lordoMan = ore * costoOr;
  const totMan = Math.round(lordoMan * (1 - spM / 100) * 100) / 100;

  out.push({
    sezione: "manodopera",
    ordine: ordine++,
    descrizione: "Manodopera",
    quantita: ore,
    prezzoUnitario: costoOr,
    totale: totMan,
  });

  const collaudo = Math.max(0, base.collaudoPrezzo ?? 0);
  out.push({
    sezione: "collaudo",
    ordine: ordine++,
    descrizione: PREVENTIVO_COLLAUDO_DESCRIZIONE,
    quantita: 1,
    prezzoUnitario: collaudo,
    totale: collaudo,
  });

  const { standard, materialiConsumo } = partitionRigheRicambi(base.righeRicambi);
  for (const r of standard) {
    out.push({ sezione: "ricambi", ordine: ordine++, riga: r });
  }
  if (materialiConsumo) {
    out.push({ sezione: "ricambi", ordine: ordine++, riga: materialiConsumo });
  }

  return out;
}

export { nextRigaId };
