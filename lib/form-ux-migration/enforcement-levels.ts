import type { FormUxEnforcementLevel } from "@/lib/form-ux-migration/types";

export const ENFORCEMENT_ORDER: FormUxEnforcementLevel[] = [
  "off",
  "warn",
  "soft-ssot",
  "hard-ssot",
  "kill-legacy",
];

export function downgradeEnforcementLevel(
  current: FormUxEnforcementLevel,
): FormUxEnforcementLevel {
  const idx = ENFORCEMENT_ORDER.indexOf(current);
  if (idx <= 0) return "off";
  return ENFORCEMENT_ORDER[idx - 1]!;
}
