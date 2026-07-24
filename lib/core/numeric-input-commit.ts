import { parseDecimalInput } from "@/lib/core/decimal-input";
import { NUMERIC_PRESETS, type NumericInputPreset } from "@/lib/core/numeric-input-policy";

export type NumericCommitResult =
  | { kind: "number"; value: number }
  | { kind: "revert" }
  | { kind: "empty" };

/** Parse draft: trailing `12.` / `0,` → integer part; full parse otherwise. */
export function parseNumericDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const partial = /^(-?\d+)[.,]$/.exec(trimmed);
  if (partial) {
    const n = Number.parseFloat(partial[1]!);
    return Number.isFinite(n) ? n : null;
  }
  return parseDecimalInput(trimmed);
}

function applyPrecision(n: number, precision: number | undefined): number {
  if (precision === undefined) return n;
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

function clampNumber(n: number, preset: NumericInputPreset): number {
  let v = n;
  if (preset.min !== undefined) v = Math.max(preset.min, v);
  if (preset.max !== undefined) v = Math.min(preset.max, v);
  return applyPrecision(v, preset.precision);
}

function resolveEmpty(preset: NumericInputPreset, committed: number): NumericCommitResult {
  switch (preset.emptyOnBlur) {
    case "revert":
      return { kind: "revert" };
    case "allowEmpty":
      return { kind: "empty" };
    case "zero":
      return { kind: "number", value: clampNumber(preset.defaultOnEmpty ?? 0, preset) };
    case "default":
      return {
        kind: "number",
        value: clampNumber(preset.defaultOnEmpty ?? committed, preset),
      };
    default:
      return { kind: "revert" };
  }
}

function resolveInvalid(preset: NumericInputPreset, committed: number): NumericCommitResult {
  if (preset.invalidDraftOnBlur === "zero") {
    return { kind: "number", value: clampNumber(preset.defaultOnEmpty ?? 0, preset) };
  }
  return { kind: "number", value: clampNumber(committed, preset) };
}

/**
 * Commit draft → numero normalizzato, revert o empty (anagrafica).
 * `committed` = ultimo valore persistito (per revert).
 */
export function commitNumericDraft(
  raw: string,
  preset: NumericInputPreset,
  committed: number,
): NumericCommitResult {
  const trimmed = raw.trim();
  if (!trimmed) return resolveEmpty(preset, committed);

  const parsed = parseNumericDraft(raw);
  if (parsed === null) return resolveInvalid(preset, committed);

  return { kind: "number", value: clampNumber(parsed, preset) };
}

/** Risolve commit in valore number da passare al parent (revert → committed). */
export function resolveCommittedNumber(result: NumericCommitResult, committed: number): number {
  if (result.kind === "number") return result.value;
  if (result.kind === "revert") return committed;
  return committed;
}

/** SSOT commit scorta — thin wrapper su policy scorta. */
export function commitScortaDraft(raw: string, committed: number): number {
  const result = commitNumericDraft(raw, NUMERIC_PRESETS.scorta, committed);
  return resolveCommittedNumber(result, committed);
}
