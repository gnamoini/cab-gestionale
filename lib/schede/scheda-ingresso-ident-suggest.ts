import {
  findMezziByVin,
  findMezzoByIngressoIdent,
  findMezzoByTargaOrMatricola,
} from "@/lib/mezzi/find-mezzo-by-ident";
import { normalizeVinIdentity } from "@/lib/domain/mezzo/mezzo-identity";
import { mezzoMatchesSmartQuery } from "@/lib/mezzi/identificazione-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";

export type SchedaIngressoIdentField = "targa" | "matricola" | "nScuderia" | "vin";

const SUGGEST_CAP = 10;

function normIdent(v: string): string {
  return v.trim().toLowerCase();
}

function identFieldValue(mezzo: MezzoGestito, field: SchedaIngressoIdentField): string {
  if (field === "targa") return mezzo.targa?.trim() ?? "";
  if (field === "matricola") return mezzo.matricola?.trim() ?? "";
  if (field === "vin") return mezzo.vin?.trim() ?? "";
  return mezzo.numeroScuderia?.trim() ?? "";
}

function normFieldQuery(query: string, field: SchedaIngressoIdentField): string {
  if (field === "vin") return normalizeVinIdentity(query) ?? query.trim().toLowerCase();
  return normIdent(query);
}

function normFieldIdent(value: string, field: SchedaIngressoIdentField): string {
  if (field === "vin") return normalizeVinIdentity(value) ?? "";
  return normIdent(value);
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

  const nq = normFieldQuery(q, field);
  const scored = mezzi
    .filter((m) => {
      const ident = identFieldValue(m, field);
      if (isEmptyIdent(ident, field)) return false;
      const ni = normFieldIdent(ident, field);
      if (ni.includes(nq) || nq.includes(ni)) return true;
      return mezzoMatchesSmartQuery(m, q);
    })
    .sort((a, b) => {
      const ai = normFieldIdent(identFieldValue(a, field), field);
      const bi = normFieldIdent(identFieldValue(b, field), field);
      const aExact = ai === nq ? 0 : ai.startsWith(nq) ? 1 : 2;
      const bExact = bi === nq ? 0 : bi.startsWith(nq) ? 1 : 2;
      if (aExact !== bExact) return aExact - bExact;
      return ai.localeCompare(bi, "it");
    });

  return scored.slice(0, SUGGEST_CAP);
}

/** Match esatto su targa, matricola o n. scuderia digitata. */
export function findExactMezzoForIngressoIdent(
  mezzi: readonly MezzoGestito[],
  field: SchedaIngressoIdentField,
  value: string,
  sibling: { targa?: string; matricola?: string; nScuderia?: string; vin?: string } = {},
): MezzoGestito | null {
  const v = value.trim();
  if (!v && field !== "nScuderia") return null;

  if (field === "vin") {
    const hits = findMezziByVin(mezzi, v);
    return hits.length === 1 ? hits[0]! : null;
  }

  const ident = {
    targa: field === "targa" ? v : sibling.targa ?? "",
    matricola: field === "matricola" ? v : sibling.matricola ?? "",
    nScuderia: field === "nScuderia" ? v : sibling.nScuderia ?? "",
    vin: sibling.vin ?? "",
  };

  if (field === "targa" || field === "matricola") {
    const hit = findMezzoByTargaOrMatricola(mezzi, ident.targa, ident.matricola);
    if (hit) return hit;
  }

  return findMezzoByIngressoIdent(mezzi, ident);
}

function trimIdent(v: string | undefined): string {
  return v?.trim() ?? "";
}

function formatClienteLabel(cliente: string | undefined): string | null {
  const c = trimIdent(cliente);
  if (!c || c === "—") return null;
  return c;
}

function formatMarcaModello(mezzo: MezzoGestito): string | null {
  const mm = `${mezzo.marca} ${mezzo.modello}`.trim();
  return mm || null;
}

function formatTargaLabel(targa: string | undefined): string | null {
  const t = trimIdent(targa);
  if (!t || t === "—") return null;
  return `Targa ${t}`;
}

function formatMatricolaLabel(matricola: string | undefined): string | null {
  const m = trimIdent(matricola);
  if (!m || m === "—" || m.toLowerCase() === "non assegnata") return null;
  return `Matr. ${m}`;
}

function formatScuderiaLabel(numeroScuderia: string | undefined): string | null {
  const s = trimIdent(numeroScuderia);
  if (!s || s === "—") return null;
  return `Scud. ${s}`;
}

function formatVinLabel(vin: string | undefined): string | null {
  const v = trimIdent(vin);
  if (!v || v === "—") return null;
  return `VIN ${v}`;
}

export function mezzoIngressoSuggestLabel(mezzo: MezzoGestito): string {
  const marcaModello = formatMarcaModello(mezzo);
  const idents = [formatTargaLabel(mezzo.targa), formatMatricolaLabel(mezzo.matricola)]
    .filter(Boolean)
    .join(" · ");
  if (marcaModello && idents) return `${marcaModello} · ${idents}`;
  return idents || marcaModello || formatClienteLabel(mezzo.cliente) || "Mezzo";
}

/** Riga secondaria autocomplete: cliente in evidenza, senza ripetere il campo già nel titolo. */
export function mezzoIngressoSuggestSecondaryLabel(
  mezzo: MezzoGestito,
  field: SchedaIngressoIdentField,
): string {
  const parts: string[] = [];
  const cliente = formatClienteLabel(mezzo.cliente);
  const marcaModello = formatMarcaModello(mezzo);
  if (cliente) parts.push(cliente);
  if (marcaModello) parts.push(marcaModello);
  if (field !== "targa") {
    const t = formatTargaLabel(mezzo.targa);
    if (t) parts.push(t);
  }
  if (field !== "matricola") {
    const m = formatMatricolaLabel(mezzo.matricola);
    if (m) parts.push(m);
  }
  if (field !== "nScuderia") {
    const s = formatScuderiaLabel(mezzo.numeroScuderia);
    if (s) parts.push(s);
  }
  if (field !== "vin") {
    const vin = formatVinLabel(mezzo.vin);
    if (vin) parts.push(vin);
  }
  const label = parts.join(" · ");
  return label || mezzoIngressoSuggestLabel(mezzo);
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
