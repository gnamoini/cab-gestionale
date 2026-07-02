import type { GeneratedDescriptionLine, DescriptionSourceType } from "./types";
import { isVerifiedTechnicalSource } from "./types";

export class ProvenanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvenanceValidationError";
  }
}

export function validateNoAnonymousLines(lines: readonly GeneratedDescriptionLine[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.sourceType?.trim()) {
      throw new ProvenanceValidationError(`Riga ${i + 1}: sourceType mancante`);
    }
    if (!line.sourceId?.trim()) {
      throw new ProvenanceValidationError(`Riga ${i + 1}: sourceId mancante`);
    }
    if (!Number.isFinite(line.confidence) || line.confidence < 0 || line.confidence > 1) {
      throw new ProvenanceValidationError(`Riga ${i + 1}: confidence invalida`);
    }
    if (!line.text.trim()) {
      throw new ProvenanceValidationError(`Riga ${i + 1}: text vuoto`);
    }
  }
}

export function defaultIsVerifiedForSource(sourceType: DescriptionSourceType): boolean {
  return isVerifiedTechnicalSource(sourceType);
}

export function linesToClienteText(lines: readonly GeneratedDescriptionLine[]): string {
  return lines
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((l) => (l.text.startsWith("-") ? l.text : `- ${l.text}`))
    .join("\n");
}

export function aggregateSemanticFingerprint(lines: readonly GeneratedDescriptionLine[]): string {
  const parts = lines
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((l) => `${l.activityId ?? ""}|${l.sourceType}|${l.sourceId}|${l.text}`);
  return parts.join("\n");
}
