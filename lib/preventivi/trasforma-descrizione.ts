import { lookupLearnedPhrase, recordApprovedPreventivoVersion, recordDescriptionCorrection } from "@/lib/preventivi/preventivi-learning-storage";
import {
  collectContextualSnippets,
  dedupeDescriptionLines,
  sortDescriptionLinesOperational,
  stripProvenanceLabel,
  type DescrizionePreventivoContext,
} from "@/lib/preventivi/preventivi-descrizione-aggregator";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function splitTechChunks(raw: string): string[] {
  return raw
    .split(/[+;,\n\r]+/g)
    .map((s) => stripProvenanceLabel(s))
    .map((s) => s.trim())
    .filter(Boolean);
}

function capitalizeSentence(chunk: string): string {
  const clean = chunk.trim().replace(/\s+/g, " ");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function heuristicLines(chunk: string): string[] {
  const low = chunk.toLowerCase();
  const clean = stripProvenanceLabel(chunk);

  if (/^(test|collaudo)/i.test(clean)) return ["Collaudo funzionale e verifica operativa"];
  if (/(smontaggio|smontato|smontare)/.test(low) && /(gruppo|blocco|carter|supporto|filtrante|pompa)/.test(low)) {
    const gruppo = /(gruppo|blocco|carter|supporto|pompa|filtrante)[\w\s-]*/i.exec(clean)?.[0]?.trim() || "gruppo operativo";
    return [`Smontaggio ${gruppo.toLowerCase()} per accesso al componente`];
  }
  if (/(rimontaggio|rimontato|rimontare)/.test(low) && /(gruppo|blocco|carter|supporto|filtrante|pompa)/.test(low)) {
    const gruppo = /(gruppo|blocco|carter|supporto|pompa|filtrante)[\w\s-]*/i.exec(clean)?.[0]?.trim() || "gruppo operativo";
    return [`Rimontaggio ${gruppo.toLowerCase()} e verifica funzionale`];
  }
  if (/(pulizia|lavaggio)/.test(low) && /(circuito|filtro|serbatoio)/.test(low)) {
    return ["Pulizia circuito e componenti interessati"];
  }
  if (/(sensore|trasduttore|sonda)/.test(low) && /(cambio|sostitu|sostit|rimoz|install)/.test(low)) {
    const componente = low.includes("trasduttore") ? "trasduttore" : low.includes("sonda") ? "sonda" : "sensore";
    return [`Sostituzione ${componente} e ripristino funzionalità`];
  }
  if (/(perdit|perdite|circuito\s+idraul)/.test(low)) return ["Verifica circuito idraulico, individuazione perdite e ripristino tenuta"];
  if (/(pompa)/.test(low) && /(cambio|sostitu|sostit)/.test(low)) return ["Smontaggio e sostituzione pompa, controllo circuito e collaudo"];
  if (/(cambio|sostitu|sostit|smont)/.test(low)) {
    const rest = clean.replace(/^(cambio|sostituzione|sostituire|smontaggio)\s+/i, "").trim();
    return [rest ? `Intervento di sostituzione ${rest.toLowerCase()}` : "Intervento di sostituzione componente"];
  }
  if (/(controllo|verifica|ispezione)/.test(low)) {
    const rest = clean.replace(/^(controllo|verifica|ispezione)\s*(e\s+verifica)?\s*:?\s*/i, "").trim();
    return [rest ? `Controllo e verifica ${rest.toLowerCase()}` : "Controllo e verifica componenti"];
  }
  return [capitalizeSentence(clean)];
}

function mapChunk(chunk: string): string[] {
  const learned = lookupLearnedPhrase(chunk);
  if (learned) {
    return learned
      .split("\n")
      .map((line) => stripProvenanceLabel(line.replace(/^-\s*/, "")))
      .filter(Boolean);
  }
  return heuristicLines(chunk);
}

function mergePrimaryWithContext(primaryLines: string[], contextLines: string[], sparsePrimary: boolean): string[] {
  const merged = [...primaryLines];
  const maxContext = sparsePrimary ? 8 : 4;

  for (const ctxLine of contextLines.slice(0, maxContext)) {
    merged.push(ctxLine);
  }

  return dedupeDescriptionLines(merged);
}

/** Trasforma note tecniche in elenco professionale per il cliente. */
export function trasformaDescrizioneLavorazioni(technicalRaw: string, ctx: DescrizionePreventivoContext): string {
  const techNorm = technicalRaw.trim().toLowerCase();
  const primaryChunks = splitTechChunks(technicalRaw);
  const sparsePrimary =
    primaryChunks.length <= 1 &&
    (techNorm.length < 28 || /^(intervento di manutenzione|controllo generale)/i.test(techNorm));

  const primaryLines = dedupeDescriptionLines(primaryChunks.flatMap((c) => mapChunk(c)));

  const contextSnippets = collectContextualSnippets(ctx, techNorm);
  const contextLines = dedupeDescriptionLines(contextSnippets.flatMap((c) => mapChunk(c)));

  const merged = mergePrimaryWithContext(primaryLines, contextLines, sparsePrimary);
  const ordered = sortDescriptionLinesOperational(merged);

  return ordered.map((l) => (l.startsWith("-") ? l : `- ${l}`)).join("\n");
}

export function maybeRecordLearningOnSave(prev: PreventivoRecord | null, next: PreventivoRecord): void {
  const tech = next.descrizioneLavorazioniTecnicaSorgente || prev?.descrizioneLavorazioniTecnicaSorgente || "";
  if (!tech.trim()) return;
  if (next.descrizioneLavorazioniCliente !== next.descrizioneGenerataAuto && (!prev || next.descrizioneLavorazioniCliente !== prev.descrizioneLavorazioniCliente)) {
    recordDescriptionCorrection(tech, next.descrizioneLavorazioniCliente);
  }
  recordApprovedPreventivoVersion(next);
}

export type { DescrizionePreventivoContext };
