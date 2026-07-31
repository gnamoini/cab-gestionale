import { createRandomUuid } from "@/lib/uuid/create-random-uuid";
import type { GeneratedDescriptionLine, DescriptionActivityOverride, OverrideStatus } from "./types";

export function applyOperatorOverrides(
  lines: GeneratedDescriptionLine[],
  overrides: DescriptionActivityOverride[] | undefined,
): GeneratedDescriptionLine[] {
  const active = (overrides ?? []).filter((o) => o.overrideStatus === "active");
  if (active.length === 0) return lines;

  let out = [...lines];

  for (const ov of active) {
    if (ov.action === "excluded") {
      out = out.filter((l) => l.activityId !== ov.activityId && l.text !== ov.originalText);
      continue;
    }
    if (ov.action === "rephrased" && ov.newText) {
      out = out.map((l) =>
        l.activityId === ov.activityId ? { ...l, text: ov.newText!, sourceType: "operator_rephrased" } : l,
      );
      continue;
    }
    if (ov.action === "moved" && ov.newSort != null) {
      out = out.map((l) => (l.activityId === ov.activityId ? { ...l, sort: ov.newSort! } : l));
    }
  }

  return out.slice().sort((a, b) => a.sort - b.sort);
}

export function markOverridesObsolete(
  overrides: DescriptionActivityOverride[],
  reason: DescriptionActivityOverride["obsoleteReason"],
): DescriptionActivityOverride[] {
  return overrides.map((o) =>
    o.overrideStatus === "active"
      ? { ...o, overrideStatus: "obsolete" as OverrideStatus, obsoleteReason: reason }
      : o,
  );
}

export function diffOverridesFromEdit(opts: {
  generationId: string;
  kbVersion: number;
  autore: string;
  generatedLines: GeneratedDescriptionLine[];
  finalTexts: string[];
}): DescriptionActivityOverride[] {
  const { generationId, kbVersion, autore, generatedLines, finalTexts } = opts;
  const now = new Date().toISOString();
  const overrides: DescriptionActivityOverride[] = [];

  const genByActivity = new Map(generatedLines.filter((l) => l.activityId).map((l) => [l.activityId!, l]));

  for (const line of generatedLines) {
    if (!line.activityId) continue;
    const stillPresent = finalTexts.some((t) => t.trim() === line.text.trim());
    if (!stillPresent) {
      overrides.push({
        id: createRandomUuid(),
        generationId,
        activityId: line.activityId,
        sourceType: line.sourceType,
        sourceId: line.sourceId,
        action: "excluded",
        overrideStatus: "active",
        originalText: line.text,
        at: now,
        by: autore,
        kbVersionAtOverride: kbVersion,
      });
    }
  }

  for (const finalText of finalTexts) {
    const match = [...genByActivity.values()].find((l) => l.text.trim() === finalText.trim());
    if (match) continue;
    const fuzzy = [...genByActivity.values()].find((l) => l.activityId && finalText.length > 8);
    if (fuzzy?.activityId && fuzzy.text.trim() !== finalText.trim()) {
      overrides.push({
        id: createRandomUuid(),
        generationId,
        activityId: fuzzy.activityId,
        sourceType: fuzzy.sourceType,
        sourceId: fuzzy.sourceId,
        action: "rephrased",
        overrideStatus: "active",
        originalText: fuzzy.text,
        newText: finalText.trim(),
        at: now,
        by: autore,
        kbVersionAtOverride: kbVersion,
      });
    }
  }

  return overrides;
}
