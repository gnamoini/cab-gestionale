import { findMezzoByTargaOrMatricola } from "@/lib/mezzi/find-mezzo-by-ident";
import { mezzoMatchesSmartQuery } from "@/lib/mezzi/identificazione-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";

export type SchedaIngressoIdentField = "targa" | "matricola";

const SUGGEST_CAP = 10;

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function identFieldValue(mezzo: MezzoGestito, field: SchedaIngressoIdentField): string {
  return field === "targa" ? mezzo.targa?.trim() ?? "" : mezzo.matricola?.trim() ?? "";
}

function isEmptyIdent(v: string, field: SchedaIngressoIdentField): boolean {
  const t = normIdent(v);
  if (!t) return true;
  if (t === "—") return true;
  if (field === "matricola" && t === "non assegnata") return true;
  return false;
}

/** Suggerimenti mezzi per autocomplete targa/matricola. */
export function suggestMezziForIngressoIdent(
  mezzi: readonly MezzoGestito[],
  field: SchedaIngressoIdentField,
  query: string,
): MezzoGestito[] {
  const q = query.trim();
  if (!q) {
    return mezzi
      .filter((m) => !isEmptyIdent(identFieldValue(m, field), field))
      .slice(0, SUGGEST_CAP);
  }

  const nq = normIdent(q);
  const scored = mezzi
    .filter((m) => {
      const ident = identFieldValue(m, field);
      if (isEmptyIdent(ident, field)) return false;
      const ni = normIdent(ident);
      if (ni.includes(nq) || nq.includes(ni)) return true;
      return mezzoMatchesSmartQuery(m, q);
    })
    .sort((a, b) => {
      const ai = normIdent(identFieldValue(a, field));
      const bi = normIdent(identFieldValue(b, field));
      const aExact = ai === nq ? 0 : ai.startsWith(nq) ? 1 : 2;
      const bExact = bi === nq ? 0 : bi.startsWith(nq) ? 1 : 2;
      if (aExact !== bExact) return aExact - bExact;
      return ai.localeCompare(bi, "it");
    });

  return scored.slice(0, SUGGEST_CAP);
}

/** Match esatto su targa o matricola digitata. */
export function findExactMezzoForIngressoIdent(
  mezzi: readonly MezzoGestito[],
  field: SchedaIngressoIdentField,
  value: string,
  otherFieldValue = "",
): MezzoGestito | null {
  const v = value.trim();
  if (!v) return null;
  if (field === "targa") {
    return findMezzoByTargaOrMatricola(mezzi, v, otherFieldValue.trim());
  }
  return findMezzoByTargaOrMatricola(mezzi, otherFieldValue.trim(), v);
}

export function mezzoIngressoSuggestLabel(mezzo: MezzoGestito): string {
  const marcaModello = `${mezzo.marca} ${mezzo.modello}`.trim();
  const targa = mezzo.targa?.trim();
  const matricola = mezzo.matricola?.trim();
  const idents = [targa && targa !== "—" ? `Targa ${targa}` : "", matricola && matricola !== "—" && matricola !== "Non assegnata" ? `Matr. ${matricola}` : ""]
    .filter(Boolean)
    .join(" · ");
  if (marcaModello && idents) return `${marcaModello} · ${idents}`;
  return idents || marcaModello || mezzo.cliente?.trim() || "Mezzo";
}

/** Evidenzia il match nel testo identificativo (targa/matricola). */
export function splitIdentHighlight(text: string, query: string): { before: string; match: string; after: string } | null {
  const t = text.trim();
  const q = query.trim();
  if (!t || !q) return null;
  const idx = t.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return null;
  return {
    before: t.slice(0, idx),
    match: t.slice(idx, idx + q.length),
    after: t.slice(idx + q.length),
  };
}
