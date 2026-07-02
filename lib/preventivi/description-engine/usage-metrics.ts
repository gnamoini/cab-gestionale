import type { DescriptionActivityOverride } from "./types";
import type { GeneratedDescriptionLine } from "./types";

export function computeOperatorAcceptanceRate(
  generatedLines: readonly GeneratedDescriptionLine[],
  overrides: readonly DescriptionActivityOverride[],
): number {
  if (generatedLines.length === 0) return 1;
  const active = overrides.filter((o) => o.overrideStatus === "active");
  const penalized = active.filter((o) => o.action === "excluded" || o.action === "rephrased").length;
  return Math.max(0, 1 - penalized / generatedLines.length);
}

export function countTechnicalHallucinations(
  lines: readonly GeneratedDescriptionLine[],
  approvedActivityIds: ReadonlySet<string>,
  approvedTexts: ReadonlySet<string>,
): number {
  let count = 0;
  for (const line of lines) {
    if (!line.isVerifiedTechnical) continue;
    const idOk = line.activityId != null && approvedActivityIds.has(line.activityId);
    const textOk = approvedTexts.has(line.text.trim().toLowerCase());
    if (!idOk && !textOk) count++;
  }
  return count;
}
