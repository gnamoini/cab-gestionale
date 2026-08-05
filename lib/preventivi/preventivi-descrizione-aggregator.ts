import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { normPhrase } from "@/lib/preventivi/preventivi-learning-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export type DescrizionePreventivoContext = {
  lavorazioneId?: string;
  cliente: string;
  targa: string;
  matricola: string;
  marcaAttrezzatura?: string;
  modelloAttrezzatura?: string;
  macchinaRiassunto?: string;
  codiciRicambi?: string[];
  /** Record preventivi da cache RQ (DB-first). */
  existingPreventiviRecords?: readonly PreventivoRecord[];
};

type ScoredSnippet = {
  text: string;
  score: number;
  sourceKey: string;
};

const PROVENANCE_PREFIX =
  /^(?:da\s+lavorazione\s+precedente|basato\s+su(?:\s+intervento)?(?:\s+storico)?|copiato\s+da|dal\s+precedente\s+intervento\s+simile|generato\s+da(?:\s+storico)?)\s*:?\s*/i;

function normIdent(value: string): string {
  return value.trim().toLowerCase();
}

function sameCliente(a: string, b: string): boolean {
  const left = normIdent(a);
  const right = normIdent(b);
  return left.length > 0 && left === right;
}

function sameMachine(
  targaA: string,
  matricolaA: string,
  targaB: string,
  matricolaB: string,
): boolean {
  const tA = normIdent(targaA);
  const tB = normIdent(targaB);
  if (tA && tB && tA === tB) return true;
  const mA = normIdent(matricolaA);
  const mB = normIdent(matricolaB);
  return Boolean(mA && mB && mA === mB);
}

function sameEquipmentType(
  ctx: DescrizionePreventivoContext,
  marca: string,
  modello: string,
  macchina: string,
): boolean {
  const ctxMarca = normIdent(ctx.marcaAttrezzatura ?? "");
  const ctxModello = normIdent(ctx.modelloAttrezzatura ?? "");
  const ctxMac = normIdent(ctx.macchinaRiassunto ?? "");
  const m = normIdent(marca);
  const mod = normIdent(modello);
  const mac = normIdent(macchina);
  if (ctxMarca && ctxModello && m && mod && ctxMarca === m && ctxModello === mod) return true;
  if (ctxMac && mac && (ctxMac === mac || ctxMac.includes(mac) || mac.includes(ctxMac))) return true;
  if (ctxMarca && m && ctxMarca === m && !ctxModello && !mod) return true;
  return false;
}

export function stripProvenanceLabel(text: string): string {
  let out = text.trim();
  for (let i = 0; i < 3; i++) {
    const next = out.replace(PROVENANCE_PREFIX, "").trim();
    if (next === out) break;
    out = next;
  }
  return out;
}

function splitToRawSnippets(raw: string): string[] {
  return raw
    .split(/[+;,\n\r]+/g)
    .map((s) => stripProvenanceLabel(s))
    .map((s) => s.trim())
    .filter(Boolean);
}

function scorePreventivoMatch(p: PreventivoRecord, ctx: DescrizionePreventivoContext, techNorm: string): number {
  let score = 0;
  const machine = sameMachine(ctx.targa, ctx.matricola, p.targa, p.matricola);
  const client = sameCliente(ctx.cliente, p.cliente);
  if (machine && client) score += 100;
  else if (machine) score += 70;
  else if (client) score += 45;
  else if (sameEquipmentType(ctx, p.marcaAttrezzatura, p.modelloAttrezzatura, p.macchinaRiassunto)) score += 22;
  else return 0;

  const pcodes = p.righeRicambi.map((r) => r.codiceOE.toLowerCase()).filter(Boolean);
  for (const c of ctx.codiciRicambi ?? []) {
    const k = c.trim().toLowerCase();
    if (k && pcodes.some((x) => x.includes(k) || k.includes(x))) score += 6;
  }

  const src = p.descrizioneLavorazioniTecnicaSorgente?.trim().toLowerCase() ?? "";
  if (techNorm.length > 12 && src.length > 12) {
    const a = techNorm.slice(0, 72);
    const b = src.slice(0, 72);
    if (a.includes(b) || b.includes(a)) score += 12;
  }

  if (p.statoCliente === "accettato" || p.statoWorkflow === "acquisito") score += 5;
  return score;
}

function snippetsFromPreventivi(ctx: DescrizionePreventivoContext, techNorm: string): ScoredSnippet[] {
  const out: ScoredSnippet[] = [];
  const seenSource = new Set<string>();

  const ranked = (ctx.existingPreventiviRecords ?? [])
    .filter((p) => p.id !== ctx.lavorazioneId)
    .map((p) => ({ p, score: scorePreventivoMatch(p, ctx, techNorm) }))
    .filter((x) => x.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  for (const { p, score } of ranked) {
    if (seenSource.has(p.id)) continue;
    seenSource.add(p.id);

    const clienteLines = p.descrizioneLavorazioniCliente
      .split("\n")
      .map((l) => stripProvenanceLabel(l.replace(/^-\s*/, "")))
      .filter(Boolean);

    for (const line of clienteLines.slice(0, 6)) {
      out.push({ text: line, score, sourceKey: `pv:${p.id}:${normPhrase(line).slice(0, 64)}` });
    }

    if (clienteLines.length === 0 && p.descrizioneLavorazioniTecnicaSorgente?.trim()) {
      for (const chunk of splitToRawSnippets(p.descrizioneLavorazioniTecnicaSorgente).slice(0, 4)) {
        out.push({ text: chunk, score: score - 8, sourceKey: `pv-tech:${p.id}:${normPhrase(chunk).slice(0, 64)}` });
      }
    }
  }

  return out;
}

function snippetsFromLavorazioniSchede(ctx: DescrizionePreventivoContext): ScoredSnippet[] {
  const store = loadLavorazioneSchedeStore();
  const out: ScoredSnippet[] = [];

  for (const [lavId, bundle] of Object.entries(store)) {
    if (ctx.lavorazioneId && lavId === ctx.lavorazioneId) continue;

    const ing = bundle.ingresso?.campi;
    const lavDoc = bundle.lavorazioni?.tipo === "lavorazioni" ? bundle.lavorazioni : null;
    const targa = ing?.targa?.trim() ?? "";
    const matricola = ing?.matricola?.trim() ?? "";
    const cliente = ing?.cliente?.trim() ?? "";
    const marca = ing?.marcaAttrezzatura?.trim() ?? "";
    const modello = ing?.modelloAttrezzatura?.trim() ?? "";
    const macchina = [marca, modello].filter(Boolean).join(" ").trim();

    const machine = sameMachine(ctx.targa, ctx.matricola, targa, matricola);
    const client = sameCliente(ctx.cliente, cliente);

    let score = 0;
    if (machine && client) score = 100;
    else if (machine) score = 72;
    else if (client) score = 48;
    else if (sameEquipmentType(ctx, marca, modello, macchina)) score = 24;
    else continue;

    const texts: string[] = [];
    for (const row of lavDoc?.campi.righe ?? []) {
      const t = row.lavorazioniEffettuate?.trim();
      if (t) texts.push(...splitToRawSnippets(t));
    }
    const anomalia = ing?.descrizioneAnomalia?.trim();
    if (anomalia && score >= 48) texts.push(anomalia);

    for (const text of texts) {
      out.push({ text, score, sourceKey: `lav:${lavId}:${normPhrase(text).slice(0, 64)}` });
    }
  }

  return out;
}

/** Token significativi per dedup semantico (no stopword operative minime). */
export function semanticDedupKey(line: string): string {
  return normPhrase(line)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(" ");
}

export function linesAreSemanticallySimilar(a: string, b: string): boolean {
  const na = semanticDedupKey(a);
  const nb = semanticDedupKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter++;
  }
  const union = wa.size + wb.size - inter;
  return union > 0 && inter / union >= 0.82;
}

export function dedupeDescriptionLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = stripProvenanceLabel(raw).trim();
    if (!line) continue;
    const dupIdx = out.findIndex((existing) => linesAreSemanticallySimilar(existing, line));
    if (dupIdx >= 0) {
      if (line.length > out[dupIdx]!.length) out[dupIdx] = line;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Ordine operativo: smontaggio → intervento → rimontaggio → collaudo. */
export function operationSortRank(line: string): number {
  const low = line.toLowerCase();
  if (/(collaudo|test funzionale|prova finale)/.test(low)) return 50;
  if (/(rimontaggio|rimontato|rimontare|rimonta)/.test(low)) return 40;
  if (/(pulizia|lavaggio circuito|sgombero)/.test(low)) return 35;
  if (/(sostitu|installazione|intervento|riparaz|sostituzione|cambio)/.test(low)) return 30;
  if (/(verifica|controllo|ispezione|diagnosi)/.test(low)) return 25;
  if (/(smontaggio|smontato|smontare|smonta)/.test(low)) return 10;
  return 32;
}

export function sortDescriptionLinesOperational(lines: string[]): string[] {
  return [...lines].sort((a, b) => {
    const ra = operationSortRank(a);
    const rb = operationSortRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "it");
  });
}

/**
 * Raccoglie snippet storici da lavorazioni e preventivi con priorità gerarchica.
 * Esclude duplicati per sourceKey e non include la lavorazione corrente.
 */
export function collectContextualSnippets(ctx: DescrizionePreventivoContext, currentTechnicalNorm: string): string[] {
  const merged = [...snippetsFromLavorazioniSchede(ctx), ...snippetsFromPreventivi(ctx, currentTechnicalNorm)];
  merged.sort((a, b) => b.score - a.score);

  const usedSource = new Set<string>();
  const lines: string[] = [];

  for (const snip of merged) {
    if (usedSource.has(snip.sourceKey)) continue;
    usedSource.add(snip.sourceKey);
    lines.push(snip.text);
    if (lines.length >= 14) break;
  }

  return dedupeDescriptionLines(lines);
}
