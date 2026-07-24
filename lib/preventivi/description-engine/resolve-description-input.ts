import { createHash } from "node:crypto";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";
import type { LavorazioneSchedeBundle } from "@/types/schede";
import type { PolishGuardContext } from "./polish-guard";

export type ResolvedDescriptionInput = {
  technicalBlob: string;
  lavorazioniLines: string[];
  anomaliaText?: string;
  lavorazioneNote?: string;
  ricambi: { ricambioId: string | null; descrizione: string; codice: string; quantita: number }[];
  technicalFingerprint: string;
  guardContext: PolishGuardContext;
};

export function buildTechnicalFingerprint(parts: {
  lavorazioniLines: readonly string[];
  ricambi: readonly { codice: string; quantita: number }[];
  anomaliaText?: string;
}): string {
  const payload = JSON.stringify({
    lines: parts.lavorazioniLines.map((l) => l.trim()).filter(Boolean),
    ricambi: parts.ricambi.map((r) => ({ c: r.codice.trim(), q: r.quantita })),
    anomalia: parts.anomaliaText?.trim() ?? "",
  });
  return createHash("sha256").update(payload).digest("hex");
}

/** Costruisce input DE da bundle persistito (puro — nessun OCR/capture/localStorage). */
export function buildDescriptionInputFromBundle(
  bundle: LavorazioneSchedeBundle,
  opts?: { magazzino?: RicambioMagazzino[]; lavorazioneNote?: string },
): ResolvedDescriptionInput {
  const ing = bundle.ingresso?.campi ?? null;
  const lavScheda = bundle.lavorazioni?.tipo === "lavorazioni" ? bundle.lavorazioni : null;
  const ricScheda = bundle.ricambi?.tipo === "ricambi" ? bundle.ricambi : null;
  const magazzino = opts?.magazzino ?? [];

  const lavorazioniLines =
    lavScheda?.campi.righe?.map((r) => r.lavorazioniEffettuate?.trim() ?? "").filter(Boolean) ?? [];

  const anomaliaIngresso = ing?.descrizioneAnomalia?.trim() ?? "";
  const techParts = [...lavorazioniLines];
  if (
    anomaliaIngresso &&
    !techParts.some((p) => p.toLowerCase().includes(anomaliaIngresso.toLowerCase().slice(0, 24)))
  ) {
    techParts.unshift(anomaliaIngresso);
  }

  const technicalBlob =
    techParts.join("\n").trim() ||
    opts?.lavorazioneNote?.trim() ||
    "Intervento di manutenzione e controllo generale.";

  const ricambi = (ricScheda?.campi.righe ?? []).map((r) => {
    const mag = r.ricambioId ? magazzino.find((x) => x.id === r.ricambioId) : undefined;
    return {
      ricambioId: r.ricambioId,
      descrizione: mag?.descrizione?.trim() || r.ricambioNome.trim(),
      codice: ricambioCodiceForUi(mag?.codiceFornitoreOriginale) || r.codice.trim(),
      quantita: Math.max(1, r.quantita || 1),
    };
  });

  const technicalFingerprint = buildTechnicalFingerprint({
    lavorazioniLines,
    ricambi: ricambi.map((r) => ({ codice: r.codice, quantita: r.quantita })),
    anomaliaText: anomaliaIngresso || undefined,
  });

  const guardContext: PolishGuardContext = {
    lineCount: 0,
    ricambiCodes: ricambi.map((r) => r.codice).filter(Boolean),
    ricambiQuantities: ricambi.map((r) => r.quantita),
    sourceText: technicalBlob,
  };

  return {
    technicalBlob,
    lavorazioniLines,
    anomaliaText: anomaliaIngresso || undefined,
    lavorazioneNote: opts?.lavorazioneNote?.trim() || undefined,
    ricambi,
    technicalFingerprint,
    guardContext,
  };
}
