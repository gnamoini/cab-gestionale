import {
  dedupeDescriptionLines,
  linesAreSemanticallySimilar,
  type DescrizionePreventivoContext,
} from "@/lib/preventivi/preventivi-descrizione-aggregator";
import {
  adaptLineFromPattern,
  lookupSimilarFullDescription,
  lookupSimilarLineForChunk,
  polishDescrizioneLine,
} from "@/lib/preventivi/preventivi-descrizione-quality";
import { pulisciDescrizioneLavorazioniSpecifiche } from "@/lib/preventivi/preventivi-struttura";
import {
  isDescrizioneCollaudo,
  isDescrizioneSanificazione,
  PREVENTIVO_SANIFICAZIONE_DESCRIZIONE,
} from "@/lib/preventivi/preventivi-voci-standard";
import { linesToClienteText } from "./provenance";
import type { GeneratedDescriptionLine } from "./types";

export type ClientDescriptionSchemaInput = {
  anomaliaText?: string;
  lavorazioniLines?: readonly string[];
  technicalBlob: string;
  ctx: DescrizionePreventivoContext;
};

const DEFAULT_RIMONTAGGIO =
  "Rimontaggio componenti smontati e verifica funzionale dell'impianto";

function splitRawChunks(raw: string): string[] {
  return raw
    .split(/[+;,\n\r]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normKey(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function chunkOverlapsAnomalia(chunk: string, anomalia: string): boolean {
  const a = normKey(anomalia);
  const c = normKey(chunk);
  if (!a || !c) return false;
  if (c === a) return true;
  const slice = a.slice(0, Math.min(24, a.length));
  return slice.length >= 8 && (c.includes(slice) || a.includes(c.slice(0, Math.min(24, c.length))));
}

function isRimontaggioLine(line: string): boolean {
  return /(rimontaggio|rimontato|rimontare|rimonta)\b/i.test(line);
}

function isSmontaggioOnlyLine(line: string): boolean {
  return /(smontaggio|smontato|smontare|smonta)\b/i.test(line) && !isRimontaggioLine(line);
}

/** Evita quantità esplicite di ricambi (es. «N. 2 portafusibili»). */
export function generalizeClienteLineQuantities(line: string): string {
  let s = line.trim();
  if (!s) return s;

  s = s.replace(/\bn\.?\s*\d+\s+/gi, "");
  s = s.replace(/\b(?:qty|quantit[aà])\s*[:.]?\s*\d+\s*/gi, "");
  s = s.replace(/\b\d+\s*(?:pz|pezzi|unit[aà])\b/gi, "");
  s = s.replace(/\s{2,}/g, " ").trim();

  if (/portafusibil/i.test(s) && !/sostituz/i.test(s)) {
    const loc = /nel\s+[\w\s]+/i.exec(s)?.[0]?.trim();
    s = loc ? `Sostituzione portafusibili ${loc}` : "Sostituzione portafusibili";
  }

  return polishDescrizioneLine(s);
}

function transformChunkToLine(chunk: string, ctx: DescrizionePreventivoContext): string {
  const learned = lookupSimilarLineForChunk(chunk, ctx);
  const line = learned ? adaptLineFromPattern(learned, chunk) : polishDescrizioneLine(chunk);
  return generalizeClienteLineQuantities(line);
}

function formatRicercaAnomaliaLine(anomalia: string, ctx: DescrizionePreventivoContext): string {
  const raw = anomalia.trim();
  if (!raw) return "";

  const learned = lookupSimilarLineForChunk(raw, ctx);
  if (learned && /(ricerca|diagnosi|segnalaz|individuaz)/i.test(learned)) {
    return generalizeClienteLineQuantities(learned);
  }

  const polished = polishDescrizioneLine(raw);
  if (/^(ricerca|diagnosi|verifica guasto|individuazione)/i.test(polished)) {
    return generalizeClienteLineQuantities(polished);
  }

  const body = polished.charAt(0).toLowerCase() + polished.slice(1);
  return generalizeClienteLineQuantities(`Ricerca e diagnosi su segnalazione: ${body}`);
}

function resolveLavorazioniSource(input: ClientDescriptionSchemaInput): string[] {
  const fromScheda = (input.lavorazioniLines ?? []).map((l) => l.trim()).filter(Boolean);
  if (fromScheda.length > 0) return fromScheda;

  const anomalia = input.anomaliaText?.trim() ?? "";
  return splitRawChunks(input.technicalBlob).filter((chunk) => !chunkOverlapsAnomalia(chunk, anomalia));
}

function toGeneratedLine(
  text: string,
  sort: number,
  sourceId: string,
  sourceType: GeneratedDescriptionLine["sourceType"] = "legacy_heuristic",
): GeneratedDescriptionLine {
  return {
    activityId: null,
    text,
    sourceType,
    sourceId,
    confidence: 0.72,
    isVerifiedTechnical: false,
    sort,
  };
}

/**
 * Schema cliente: sanificazione (UI) → ricerca anomalia → lavorazioni → rimontaggio.
 * Sanificazione resta fuori dal testo persistito (prepend editor).
 */
export function composeClienteDescriptionSchema(input: ClientDescriptionSchemaInput): {
  lines: GeneratedDescriptionLine[];
  clienteText: string;
} {
  const anomalia = input.anomaliaText?.trim() ?? "";
  const learnedFull = lookupSimilarFullDescription(input.technicalBlob, input.ctx);
  if (learnedFull?.trim()) {
    const learnedLines = dedupeDescriptionLines(
      learnedFull
        .split(/\n+/)
        .map((l) => l.replace(/^-\s*/, "").trim())
        .filter(Boolean)
        .filter((l) => !isDescrizioneSanificazione(l) && !isDescrizioneCollaudo(l))
        .map((l) => generalizeClienteLineQuantities(l)),
    );
    if (learnedLines.length > 0) {
      const ordered = orderLinesIntoSchema(learnedLines, anomalia);
      const lines = ordered.map((text, idx) =>
        toGeneratedLine(text, idx + 1, `schema-learned:${idx}`),
      );
      const clienteText = pulisciDescrizioneLavorazioniSpecifiche(linesToClienteText(lines));
      return { lines, clienteText };
    }
  }

  const phaseLines: string[] = [];
  const lavorazioniRaw = resolveLavorazioniSource(input);
  const rimontaggioFromWork: string[] = [];
  const lavorazioniWork: string[] = [];

  if (anomalia) {
    phaseLines.push(formatRicercaAnomaliaLine(anomalia, input.ctx));
  }

  for (const chunk of lavorazioniRaw) {
    if (isDescrizioneSanificazione(chunk) || isDescrizioneCollaudo(chunk)) continue;
    if (anomalia && chunkOverlapsAnomalia(chunk, anomalia)) continue;

    const line = transformChunkToLine(chunk, input.ctx);
    if (!line) continue;

    if (isRimontaggioLine(line)) {
      rimontaggioFromWork.push(line);
      continue;
    }
    lavorazioniWork.push(line);
  }

  phaseLines.push(...dedupeDescriptionLines(lavorazioniWork));

  const needsDefaultRimontaggio =
    rimontaggioFromWork.length === 0 &&
    (lavorazioniWork.some((l) => isSmontaggioOnlyLine(l)) || lavorazioniWork.length > 0);

  if (rimontaggioFromWork.length > 0) {
    phaseLines.push(...dedupeDescriptionLines(rimontaggioFromWork));
  } else if (needsDefaultRimontaggio) {
    phaseLines.push(generalizeClienteLineQuantities(DEFAULT_RIMONTAGGIO));
  }

  const ordered = dedupeDescriptionLines(phaseLines).filter(Boolean);
  if (ordered.length === 0 && input.technicalBlob.trim()) {
    ordered.push(
      transformChunkToLine(
        input.technicalBlob.trim() || "Intervento di manutenzione e controllo generale",
        input.ctx,
      ),
    );
  }

  const lines = ordered.map((text, idx) => toGeneratedLine(text, idx + 1, `schema:${idx}`));
  const clienteText = pulisciDescrizioneLavorazioniSpecifiche(linesToClienteText(lines));
  return { lines, clienteText };
}

function orderLinesIntoSchema(lines: string[], anomalia: string): string[] {
  const ricerca: string[] = [];
  const lavorazioni: string[] = [];
  const rimontaggio: string[] = [];

  for (const line of lines) {
    if (anomalia && (linesAreSemanticallySimilar(line, anomalia) || /(ricerca|diagnosi|segnalaz)/i.test(line))) {
      ricerca.push(line);
    } else if (isRimontaggioLine(line)) {
      rimontaggio.push(line);
    } else if (isDescrizioneSanificazione(line)) {
      continue;
    } else {
      lavorazioni.push(line);
    }
  }

  if (ricerca.length === 0 && anomalia) {
    ricerca.push(formatRicercaAnomaliaLine(anomalia, { cliente: "", targa: "", matricola: "" }));
  }

  const out = [...ricerca, ...lavorazioni];
  if (rimontaggio.length > 0) out.push(...rimontaggio);
  else if (lavorazioni.length > 0) out.push(generalizeClienteLineQuantities(DEFAULT_RIMONTAGGIO));
  return dedupeDescriptionLines(out);
}

/** Hint editor: sanificazione è sempre la prima riga visibile. */
export function preventivoSanificazioneClienteLine(): string {
  return `- ${PREVENTIVO_SANIFICAZIONE_DESCRIZIONE};`;
}
