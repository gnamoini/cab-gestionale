import type {
  InterpretationModel,
  SemanticDuplicateCandidate,
} from "@/lib/document-capture/model/interpretation-model";
import type { InterventionCandidate } from "@/lib/document-capture/model/interpretation-model";

export type DuplicateLookupRow = {
  id: string;
  cliente: string | null;
  targa: string | null;
  matricola: string | null;
  dataIngresso: string | null;
};

function scoreMatch(candidate: InterventionCandidate, row: DuplicateLookupRow): number {
  const fp = candidate.fingerprint;
  const signals: SemanticDuplicateCandidate["signals"] = [];
  let score = 0;

  if (fp.cliente && row.cliente && fp.cliente.toLowerCase() === row.cliente.toLowerCase()) {
    score += 0.35;
    signals.push("same_cliente");
  }
  if (fp.targa && row.targa && fp.targa.replace(/\s/g, "").toUpperCase() === row.targa.replace(/\s/g, "").toUpperCase()) {
    score += 0.35;
    signals.push("same_mezzo");
  }
  if (fp.matricola && row.matricola && fp.matricola === row.matricola) {
    score += 0.2;
    signals.push("same_matricola");
  }
  if (fp.dataIngresso && row.dataIngresso && fp.dataIngresso.slice(0, 10) === row.dataIngresso.slice(0, 10)) {
    score += 0.1;
    signals.push("same_day");
  }

  if (score < 0.5) return 0;
  return Math.min(1, score);
}

/** Duplicate detection separato dal Domain Service. */
export function detectSemanticDuplicates(
  interpretation: InterpretationModel,
  existingRows: readonly DuplicateLookupRow[],
  threshold = 0.72,
): InterpretationModel {
  const duplicates: SemanticDuplicateCandidate[] = [];

  for (const candidate of interpretation.interventionCandidates) {
    for (const row of existingRows) {
      const matchScore = scoreMatch(candidate, row);
      if (matchScore >= threshold) {
        const fp = candidate.fingerprint;
        const signals: SemanticDuplicateCandidate["signals"] = [];
        if (fp.cliente && row.cliente && fp.cliente.toLowerCase() === row.cliente.toLowerCase()) signals.push("same_cliente");
        if (
          fp.targa &&
          row.targa &&
          fp.targa.replace(/\s/g, "").toUpperCase() === row.targa.replace(/\s/g, "").toUpperCase()
        ) {
          signals.push("same_mezzo");
        }
        if (fp.matricola && row.matricola && fp.matricola === row.matricola) signals.push("same_matricola");
        if (
          fp.dataIngresso &&
          row.dataIngresso &&
          fp.dataIngresso.slice(0, 10) === row.dataIngresso.slice(0, 10)
        ) {
          signals.push("same_day");
        }
        duplicates.push({
          existingLavorazioneId: row.id,
          matchScore,
          signals,
        });
      }
    }
  }

  const suggestedActions = [...interpretation.suggestedActions];
  if (duplicates.length > 0) {
    suggestedActions.push({
      type: "link_existing",
      message: `Possibile duplicato ${Math.round(duplicates[0]!.matchScore * 100)}% — aprire lavorazione esistente?`,
      targetLavorazioneId: duplicates[0]!.existingLavorazioneId,
    });
  }

  return {
    ...interpretation,
    semanticDuplicates: duplicates,
    suggestedActions,
  };
}
