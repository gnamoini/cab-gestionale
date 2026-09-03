import {
  isDescrizioneCollaudo,
  isDescrizioneMaterialiConsumo,
  isDescrizioneSmaltimento,
  isVoceSanificazionePreventivo,
  PREVENTIVO_MATERIALI_CONSUMO_DESCRIZIONE,
  PREVENTIVO_RIGA_MATERIALI_ID,
  resolveCollaudoDescrizione,
  resolveSanificazioneDescrizione,
} from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoManodopera, PreventivoRecord, PreventivoRigaRicambio, PreventivoRigaRicambioTipo } from "@/lib/preventivi/types";
import { normalizeCollaudoOre, normalizeSanificazioneOre, resolveVoceOrePrezzoManodopera, totaleCollaudoPreventivo, totaleSanificazionePreventivo } from "@/lib/preventivi/preventivi-collaudo";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";

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

export function normalizeRigaRicambio(r: PreventivoRigaRicambio): PreventivoRigaRicambio {
  return { ...r, unitaMisura: parseRicambioUnitaMisura(r.unitaMisura) };
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
    standard.push(normalizeRigaRicambio({ ...r, tipo: "standard" }));
  }
  return { standard, materialiConsumo };
}

/** Prima riga visibile nell'editor lavorazioni (sanificazione obbligatoria, fuori dal testo persistito). */
export function preventivoSanificazioneClienteEditorLine(sanificazioneDescrizione?: string | null): string {
  return `- ${resolveSanificazioneDescrizione(sanificazioneDescrizione)};`;
}

/** Testo editor = sanificazione + specifiche persistite (SSOT con PDF). */
export function composePreventivoLavorazioniClienteEditorText(
  specifiche: string,
  sanificazioneDescrizione?: string | null,
): string {
  const line = preventivoSanificazioneClienteEditorLine(sanificazioneDescrizione);
  const rest = pulisciDescrizioneLavorazioniSpecifiche(specifiche).trim();
  if (!rest) return line;
  return `${line}\n${rest}`;
}

/** Estrae solo le specifiche dal testo composto editor. */
export function extractPreventivoLavorazioniClienteSpecifiche(composed: string): string {
  return pulisciDescrizioneLavorazioniSpecifiche(composed);
}

/**
 * Righe sezione lavorazioni nel PDF — stesso contenuto dell'editor
 * (sanificazione + specifiche pulite). Non usa righe strutturali né sorgente tecnica.
 */
export function parsePreventivoLavorazioniClientePdfLines(
  specifiche: string,
  sanificazioneDescrizione?: string | null,
): string[] {
  const composed = composePreventivoLavorazioniClienteEditorText(
    pulisciDescrizioneLavorazioniSpecifiche(specifiche),
    sanificazioneDescrizione,
  );
  return composed
    .split(/\n+/)
    .map((l) => l.replace(/^-\s*/, "").replace(/;\s*$/, "").trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !isVoceSanificazionePreventivo(l, sanificazioneDescrizione) &&
        !isDescrizioneCollaudo(l),
    );
}

/** ponytail: solo ` - ` (spazi attorno al trattino), non trattini intra-parola (es. semi-asse). */
function expandInlineDescrizioneLavorazioniItems(line: string): string[] {
  return line
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Rimuove voci strutturali duplicate dal testo lavorazioni (sanificazione, collaudo). */
export function pulisciDescrizioneLavorazioniSpecifiche(testo: string): string {
  const lines = testo
    .split(/\n+/)
    .flatMap((l) => {
      const stripped = l.replace(/^-\s*/, "").trim();
      if (!stripped) return [];
      return expandInlineDescrizioneLavorazioniItems(stripped);
    });
  const kept = lines.filter((l) => {
    if (isVoceSanificazionePreventivo(l)) return false;
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
    unitaMisura: "pz",
  };
}

/** Normalizza manodopera — migra legacy `costoOrario` come prezzo cliente se `prezzoOrario` assente. */
export function normalizePreventivoManodopera(m: PreventivoManodopera | undefined): PreventivoManodopera {
  const legacyRate = Math.max(0, Number(m?.costoOrario) || 0);
  const prezzoOrario = Math.max(0, Number(m?.prezzoOrario) || 0) || legacyRate;
  return {
    oreTotali: Math.max(0, Number(m?.oreTotali) || 0),
    righeAddetti: m?.righeAddetti ?? [],
    costoOrario: legacyRate,
    prezzoOrario,
    scontoPercent: Math.min(100, Math.max(0, Number(m?.scontoPercent) || 0)),
  };
}

/** Garantisce campi e righe coerenti con la struttura standard (idempotente). */
export function ensurePreventivoStruttura(p: PreventivoRecord): PreventivoRecord {
  const manodopera = normalizePreventivoManodopera(p.manodopera);
  const prezzoOrario = manodopera.prezzoOrario;
  const sanificazioneOre = normalizeSanificazioneOre(p.sanificazioneOre);
  const sanificazionePrezzo = resolveVoceOrePrezzoManodopera(
    sanificazioneOre,
    p.sanificazionePrezzo,
    prezzoOrario,
  );
  const sanificazioneDescrizione = resolveSanificazioneDescrizione(p.sanificazioneDescrizione);
  const collaudoOre = normalizeCollaudoOre(p.collaudoOre);
  const collaudoPrezzo = resolveVoceOrePrezzoManodopera(collaudoOre, p.collaudoPrezzo, prezzoOrario);
  const collaudoDescrizione = resolveCollaudoDescrizione(p.collaudoDescrizione);

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
    manodopera,
    sanificazionePrezzo,
    sanificazioneOre,
    sanificazioneDescrizione,
    collaudoPrezzo,
    collaudoOre,
    collaudoDescrizione,
    descrizioneLavorazioniCliente,
    righeRicambi: [...standard, normalizeRigaRicambio(materiali)],
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
    .filter((l) => l.length > 0 && !isVoceSanificazionePreventivo(l) && !isDescrizioneCollaudo(l));
}

export type PreventivoRigaOutput =
  | { sezione: "lavorazioni"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number; locked?: boolean }
  | { sezione: "sanificazione"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number }
  | { sezione: "manodopera"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number }
  | { sezione: "collaudo"; ordine: number; descrizione: string; quantita: number; prezzoUnitario: number; totale: number }
  | { sezione: "ricambi"; ordine: number; riga: PreventivoRigaRicambio };

/** Ordine fisso per PDF, report e riepiloghi. */
export function buildPreventivoOutputRighe(p: PreventivoRecord): PreventivoRigaOutput[] {
  const base = ensurePreventivoStruttura(p);
  const out: PreventivoRigaOutput[] = [];
  let ordine = 1;

  const sanOre = normalizeSanificazioneOre(base.sanificazioneOre);
  const sanPrezzo = Math.max(0, base.sanificazionePrezzo ?? 0);
  const sanTot = totaleSanificazionePreventivo({ sanificazioneOre: sanOre, sanificazionePrezzo: sanPrezzo });
  out.push({
    sezione: "sanificazione",
    ordine: ordine++,
    descrizione: base.sanificazioneDescrizione ?? "",
    quantita: sanOre,
    prezzoUnitario: sanPrezzo,
    totale: sanTot,
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
  const prezzoOr = Math.max(
    0,
    Number(base.manodopera.prezzoOrario) || Number(base.manodopera.costoOrario) || 0,
  );
  const spM = Math.min(100, Math.max(0, base.manodopera.scontoPercent ?? 0));
  const lordoMan = ore * prezzoOr;
  const totMan = Math.round(lordoMan * (1 - spM / 100) * 100) / 100;

  out.push({
    sezione: "manodopera",
    ordine: ordine++,
    descrizione: "Manodopera",
    quantita: ore,
    prezzoUnitario: prezzoOr,
    totale: totMan,
  });

  const collaudoOre = normalizeCollaudoOre(base.collaudoOre);
  const collaudoPu = Math.max(0, base.collaudoPrezzo ?? 0);
  const collaudoTot = totaleCollaudoPreventivo({ collaudoOre, collaudoPrezzo: collaudoPu });
  out.push({
    sezione: "collaudo",
    ordine: ordine++,
    descrizione: resolveCollaudoDescrizione(base.collaudoDescrizione),
    quantita: collaudoOre,
    prezzoUnitario: collaudoPu,
    totale: collaudoTot,
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
