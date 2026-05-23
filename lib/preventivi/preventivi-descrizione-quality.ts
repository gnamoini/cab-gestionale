import { normPhrase, loadPreventiviLearning } from "@/lib/preventivi/preventivi-learning-storage";
import type { DescrizionePreventivoContext } from "@/lib/preventivi/preventivi-descrizione-aggregator";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Correzioni ortografiche frequenti (officina / referti tecnici). */
const TYPO_REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
  [/\bsostit\s*u\s*zione\b/gi, "sostituzione"],
  [/\bmanutenz\b/gi, "manutenzione"],
  [/\bverfica\b/gi, "verifica"],
  [/\bcontollo\b/gi, "controllo"],
  [/\bpompa\s*h\b/gi, "pompa idraulica"],
  [/\s{2,}/g, " "],
] as const;

function tokenSet(s: string): Set<string> {
  return new Set(
    normPhrase(s)
      .split(/[^a-z0-9àèéìòù]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3),
  );
}

/** Similarità Jaccard su token significativi (0–1). */
export function tokenSimilarity(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

export function polishDescrizioneLine(line: string): string {
  let s = line.trim().replace(/\s+/g, " ");
  for (const [re, rep] of TYPO_REPLACEMENTS) {
    s = s.replace(re, rep);
  }
  s = s.replace(/\s+([,.;:])/g, "$1");
  if (!s) return s;
  const first = s.charAt(0).toUpperCase();
  return first + s.slice(1);
}

function parseClienteLines(testo: string): string[] {
  return testo
    .split(/\n+/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Se il testo tecnico è molto simile a un preventivo già approvato/salvato, riusa la descrizione cliente.
 */
export function lookupSimilarFullDescription(
  technicalRaw: string,
  ctx?: Pick<DescrizionePreventivoContext, "lavorazioneId" | "existingPreventiviRecords">,
): string | null {
  const norm = normPhrase(technicalRaw);
  if (norm.length < 12) return null;

  let best: { score: number; text: string } | null = null;

  const records: readonly PreventivoRecord[] = ctx?.existingPreventiviRecords ?? [];

  for (const p of records) {
    if (ctx?.lavorazioneId && p.lavorazioneId === ctx.lavorazioneId) continue;
    const src = normPhrase(p.descrizioneLavorazioniTecnicaSorgente);
    const out = p.descrizioneLavorazioniCliente.trim();
    if (!src || !out) continue;
    const score = tokenSimilarity(norm, src);
    if (score < 0.62) continue;
    if (!best || score > best.score) best = { score, text: out };
  }

  const st = loadPreventiviLearning();
  for (const fv of st.finalVersions) {
    const score = tokenSimilarity(norm, fv.fromNorm);
    if (score < 0.65) continue;
    if (!best || score > best.score) best = { score, text: fv.to };
  }

  return best && best.score >= 0.62 ? best.text : null;
}

/**
 * Trova una riga cliente già standardizzata simile al chunk tecnico corrente.
 */
export function lookupSimilarLineForChunk(chunk: string, ctx: DescrizionePreventivoContext): string | null {
  const norm = normPhrase(chunk);
  if (norm.length < 4) return null;

  let best: { score: number; line: string } | null = null;

  const considerLine = (candidateChunk: string, clienteLine: string) => {
    const score = tokenSimilarity(norm, normPhrase(candidateChunk));
    if (score < 0.45) return;
    const polished = polishDescrizioneLine(clienteLine);
    if (!polished) return;
    if (!best || score > best.score) best = { score, line: polished };
  };

  const records: readonly PreventivoRecord[] = ctx?.existingPreventiviRecords ?? [];

  for (const p of records) {
    if (p.lavorazioneId && p.lavorazioneId === ctx.lavorazioneId) continue;
    const techParts = p.descrizioneLavorazioniTecnicaSorgente.split(/[+;,\n\r]+/);
    const clientLines = parseClienteLines(p.descrizioneLavorazioniCliente);
    for (let i = 0; i < techParts.length; i++) {
      const tech = techParts[i]?.trim();
      if (!tech) continue;
      const line = clientLines[i] ?? clientLines.find((cl) => tokenSimilarity(tech, cl) > 0.35);
      if (line) considerLine(tech, line);
    }
    for (const line of clientLines) {
      if (tokenSimilarity(norm, line) >= 0.55) {
        if (!best || tokenSimilarity(norm, line) > best.score) {
          best = { score: tokenSimilarity(norm, line), line: polishDescrizioneLine(line) };
        }
      }
    }
  }

  const st = loadPreventiviLearning();
  for (const [fromNorm, to] of Object.entries(st.phraseMap)) {
    if (tokenSimilarity(norm, fromNorm) >= 0.5) {
      const firstLine = parseClienteLines(to)[0] ?? to;
      considerLine(fromNorm, firstLine);
    }
  }

  return best && best.score >= 0.48 ? best.line : null;
}

/** Applica stile appreso mantenendo il contenuto specifico del chunk quando possibile. */
export function adaptLineFromPattern(learnedLine: string, chunk: string): string {
  const line = polishDescrizioneLine(learnedLine);
  const chunkClean = chunk.trim().replace(/\s+/g, " ");
  if (!chunkClean) return line;

  const lowLine = line.toLowerCase();
  const mSost = /sostituzione\s+(.+?)(?:\s+e\s+|\s*$)/i.exec(line);
  const mSmont = /smontaggio\s+(.+?)\s+per/i.exec(line);
  const mRim = /rimontaggio\s+(.+?)\s+e/i.exec(line);

  if (mSost && /(sostitu|cambio|install)/i.test(chunkClean)) {
    const comp = chunkClean.replace(/^(cambio|sostituzione|sostituire|installazione)\s+(di\s+)?/i, "").trim();
    if (comp.length >= 3) return polishDescrizioneLine(`Sostituzione ${comp.toLowerCase()} e ripristino funzionalità`);
  }
  if (mSmont && /(smont)/i.test(chunkClean)) {
    const comp = chunkClean.replace(/^smontaggio\s+/i, "").trim();
    if (comp.length >= 3) return polishDescrizioneLine(`Smontaggio ${comp.toLowerCase()} per accesso al componente`);
  }
  if (mRim && /(rimont)/i.test(chunkClean)) {
    const comp = chunkClean.replace(/^rimontaggio\s+/i, "").trim();
    if (comp.length >= 3) return polishDescrizioneLine(`Rimontaggio ${comp.toLowerCase()} e verifica funzionale`);
  }

  if (tokenSimilarity(line, chunkClean) < 0.25 && !lowLine.includes(chunkClean.toLowerCase().slice(0, 8))) {
    return line;
  }
  return line;
}
