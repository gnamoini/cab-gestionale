import { incrementHealthCounter } from "@/lib/observability/runtime-health";

/** Opt-in: `NEXT_PUBLIC_FSE_SHADOW=1` confronta snapshot vs getter legacy (telemetria only). */
export function isFormEngineShadowMode(): boolean {
  return process.env.NEXT_PUBLIC_FSE_SHADOW === "1";
}

export function reportFormEngineShadowMismatch(label?: string): void {
  incrementHealthCounter(label ? `fseShadowMismatch_${label}` : "fseShadowMismatch");
}

/** Confronto shallow JSON per rilevare divergenze snapshot vs state al submit. */
export function compareFormEngineShadow<T>(
  snap: T,
  live: T,
  label?: string,
): void {
  if (!isFormEngineShadowMode()) return;
  try {
    if (JSON.stringify(snap) !== JSON.stringify(live)) {
      reportFormEngineShadowMismatch(label);
    }
  } catch {
    reportFormEngineShadowMismatch(label);
  }
}
