import type { FormUxInputKind } from "@/lib/form-ux-migration/types";

function normalizeNumber(value: string): string {
  const trimmed = value.trim().replace(/,/g, ".");
  if (trimmed === "" || trimmed === "-") return trimmed;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return trimmed;
  return String(n);
}

function normalizeText(value: string): string {
  return value.normalize("NFC").replace(/\s+$/u, "");
}

/** Normalize values before legacy vs SSOT comparison. */
export function normalizeFormUxValue(kind: FormUxInputKind, value: string): string {
  switch (kind) {
    case "number":
    case "numberStepper":
      return normalizeNumber(value);
    case "text":
    case "textarea":
    case "select":
    case "checkbox":
      return normalizeText(value);
    default:
      return value;
  }
}

export function compareFormUxValues(
  kind: FormUxInputKind,
  legacy: string,
  ssot: string,
): { match: boolean; normalizedLegacy: string; normalizedSsot: string } {
  const normalizedLegacy = normalizeFormUxValue(kind, legacy);
  const normalizedSsot = normalizeFormUxValue(kind, ssot);
  return {
    match: normalizedLegacy === normalizedSsot,
    normalizedLegacy,
    normalizedSsot,
  };
}
