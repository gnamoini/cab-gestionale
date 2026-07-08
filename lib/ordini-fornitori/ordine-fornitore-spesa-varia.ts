/** Righe spese varie ordine fornitore — flag in `meta.spesaVaria`, stessa tabella righe. */

import { defaultOrdineRigaMeta, patchRigaMeta } from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";
import { totaleNettoRigaOrdine } from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type { OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";

export const ORDINE_RIGA_META_SPESA_VARIA = "spesaVaria";

export function isOrdineSpesaVariaRiga(meta: Record<string, unknown> | null | undefined): boolean {
  return meta?.[ORDINE_RIGA_META_SPESA_VARIA] === true;
}

export function splitOrdineRighe(righe: readonly OrdineFornitoreRiga[]): {
  oggetti: OrdineFornitoreRiga[];
  speseVarie: OrdineFornitoreRiga[];
} {
  const oggetti: OrdineFornitoreRiga[] = [];
  const speseVarie: OrdineFornitoreRiga[] = [];
  for (const r of righe) {
    if (isOrdineSpesaVariaRiga(r.meta)) speseVarie.push(r);
    else oggetti.push(r);
  }
  return { oggetti, speseVarie };
}

export function mergeOrdineRighe(
  oggetti: readonly OrdineFornitoreRiga[],
  speseVarie: readonly OrdineFornitoreRiga[],
): OrdineFornitoreRiga[] {
  return [...oggetti, ...speseVarie].map((r, i) => ({ ...r, ordine: i + 1 }));
}

export function buildEmptyOrdineSpesaVariaRiga(fallbackIva = 22): OrdineFornitoreRiga {
  const meta = patchRigaMeta(defaultOrdineRigaMeta(fallbackIva), { ivaPercent: fallbackIva });
  meta[ORDINE_RIGA_META_SPESA_VARIA] = true;
  const base = {
    id: crypto.randomUUID(),
    ordine: 0,
    ricambioId: null,
    codice: "",
    descrizione: "",
    quantita: 1,
    prezzoUnitario: 0,
    scontoPercent: 0,
    totaleRiga: 0,
    unitaMisura: "pz" as const,
    ivaPercent: fallbackIva,
    meta,
  };
  return { ...base, totaleRiga: totaleNettoRigaOrdine(base) };
}

export function legacyTrasportoToSpesaVariaRiga(
  trasporto: number,
  ivaPercent: number,
): OrdineFornitoreRiga | null {
  const importo = Math.max(0, Number(trasporto) || 0);
  if (importo <= 0) return null;
  const iva = Math.min(100, Math.max(0, Number(ivaPercent) || 22));
  const meta = patchRigaMeta(defaultOrdineRigaMeta(iva), { ivaPercent: iva });
  meta[ORDINE_RIGA_META_SPESA_VARIA] = true;
  const base = {
    id: crypto.randomUUID(),
    ordine: 0,
    ricambioId: null,
    codice: "",
    descrizione: "Spese di trasporto",
    quantita: 1,
    prezzoUnitario: importo,
    scontoPercent: 0,
    totaleRiga: importo,
    unitaMisura: "pz" as const,
    ivaPercent: iva,
    meta,
  };
  return base;
}

export function ordineRigheWithLegacyTrasporto(
  righe: OrdineFornitoreRiga[],
  trasporto: number,
  ivaPercent: number,
): OrdineFornitoreRiga[] {
  if (trasporto <= 0 || righe.some((r) => isOrdineSpesaVariaRiga(r.meta))) return righe;
  const legacy = legacyTrasportoToSpesaVariaRiga(trasporto, ivaPercent);
  if (!legacy) return righe;
  const { oggetti, speseVarie } = splitOrdineRighe(righe);
  return mergeOrdineRighe(oggetti, [...speseVarie, legacy]);
}
