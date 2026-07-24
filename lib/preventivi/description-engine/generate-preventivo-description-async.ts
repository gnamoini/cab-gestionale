import { generatePreventivoDescription } from "./description-engine";
import {
  polishPreventivoDescriptionClient,
  type PreventivoPolishClientInput,
} from "./preventivo-polish.client";
import { resolveDescriptionInputFromDb } from "./resolve-description-input.client";
import type { ResolvedDescriptionInput } from "./resolve-description-input";
import type { ComposedDescription, DescriptionEngineInput } from "./types";
import type { PreventivoPolishReason } from "./preventivo-polish.server";
import { pulisciDescrizioneLavorazioniSpecifiche } from "@/lib/preventivi/preventivi-struttura";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type DescriptionGenerationProgressStep =
  | "resolving"
  | "analyzing"
  | "generating"
  | "polishing"
  | "ready";

export type DescriptionGenerationProgress = {
  step: DescriptionGenerationProgressStep;
  label: string;
};

export type PreventivoPolishOutcome = {
  attempted: true;
  applied: boolean;
  fallback: boolean;
  reason?: PreventivoPolishReason;
  cacheHit?: boolean;
  durationMs?: number;
  model?: string;
};

export type GeneratePreventivoDescriptionResult = {
  description: string;
  composed: ComposedDescription;
  polish: PreventivoPolishOutcome;
  technicalBlob: string;
};

export type GeneratePreventivoDescriptionAsyncDeps = {
  resolveInput?: (
    lavorazioneId: string,
    opts?: { magazzino?: RicambioMagazzino[]; lavorazioneNote?: string },
  ) => Promise<ResolvedDescriptionInput>;
  polish?: (input: PreventivoPolishClientInput) => ReturnType<typeof polishPreventivoDescriptionClient>;
};

export type GeneratePreventivoDescriptionAsyncInput = Omit<
  DescriptionEngineInput,
  "technicalBlob" | "lavorazioniLines" | "anomaliaText" | "lavorazioneNote" | "ricambi" | "aiPolishFn"
> & {
  lavorazioneId: string;
  magazzino?: RicambioMagazzino[];
  lavorazioneNote?: string;
  onProgress?: (progress: DescriptionGenerationProgress) => void;
  deps?: GeneratePreventivoDescriptionAsyncDeps;
};

/** Unico entry point produzione: Resolver DB → DE → AI Polish obbligatorio. */
export async function generatePreventivoDescriptionAsync(
  input: GeneratePreventivoDescriptionAsyncInput,
): Promise<GeneratePreventivoDescriptionResult> {
  const { onProgress, magazzino, lavorazioneNote, lavorazioneId, deps, ...engineBase } = input;
  const resolveInput = deps?.resolveInput ?? resolveDescriptionInputFromDb;
  const polishFn = deps?.polish ?? polishPreventivoDescriptionClient;

  onProgress?.({ step: "resolving", label: "Analisi lavorazioni" });

  const resolved = await resolveInput(lavorazioneId, {
    magazzino,
    lavorazioneNote,
  });

  onProgress?.({ step: "generating", label: "Generazione testo cliente" });

  const engineInput: DescriptionEngineInput = {
    ...engineBase,
    lavorazioneId,
    technicalBlob: resolved.technicalBlob,
    lavorazioniLines: resolved.lavorazioniLines,
    anomaliaText: resolved.anomaliaText,
    lavorazioneNote: resolved.lavorazioneNote,
    ricambi: resolved.ricambi.map((r) => ({
      ricambioId: r.ricambioId,
      descrizione: r.descrizione,
      codice: r.codice,
    })),
  };

  const composed = generatePreventivoDescription(engineInput);

  onProgress?.({ step: "polishing", label: "Ottimizzazione descrizione AI" });

  const polishResult = await polishFn({
    description: composed.clienteText,
    technicalFingerprint: resolved.technicalFingerprint,
    guardContext: {
      ...resolved.guardContext,
      lineCount: composed.clienteText
        .split(/\r?\n/)
        .map((l) => l.replace(/^-\s*/, "").trim())
        .filter(Boolean).length,
    },
  });

  if (!polishResult.attempted) {
    throw new Error("AI Polish non tentato: violazione contratto generazione preventivo.");
  }

  const finalDescription = pulisciDescrizioneLavorazioniSpecifiche(polishResult.text);

  const composedFinal: ComposedDescription = {
    ...composed,
    clienteText: finalDescription,
    meta: {
      ...composed.meta,
      aiPolishApplied: polishResult.applied,
      aiRejectReason: polishResult.fallback
        ? polishResult.reason === "guard_reject"
          ? "forbidden_new_activity"
          : undefined
        : undefined,
      polish: {
        attempted: true,
        applied: polishResult.applied,
        fallback: polishResult.fallback,
        reason: polishResult.reason,
        cacheHit: polishResult.cacheHit,
        durationMs: polishResult.durationMs,
        model: polishResult.model,
      },
    },
  };

  onProgress?.({ step: "ready", label: "Preventivo pronto" });

  return {
    description: finalDescription,
    composed: composedFinal,
    polish: {
      attempted: true,
      applied: polishResult.applied,
      fallback: polishResult.fallback,
      reason: polishResult.reason,
      cacheHit: polishResult.cacheHit,
      durationMs: polishResult.durationMs,
      model: polishResult.model,
    },
    technicalBlob: resolved.technicalBlob,
  };
}
