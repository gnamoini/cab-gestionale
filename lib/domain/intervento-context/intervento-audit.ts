import type { InterventoContext } from "@/lib/domain/intervento-context/intervento-context.types";
import type { ResolveMezzoFromSchedaResult } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import type { CopyLastMode } from "@/lib/domain/scheda-ingresso/copy-last-scheda";

export type InterventoAuditEvent =
  | "build"
  | "display"
  | "copy-last"
  | "write-mezzo"
  | "write-scheda";

export type InterventoAuditPayload = {
  contextId?: string;
  mismatch?: boolean;
  sourceOfTruthUsed?: "scheda" | "lavorazione" | "mezzo";
  copyMode?: CopyLastMode;
  candidateCount?: number;
  preferredMezzoId?: string | null;
  resolvedMezzoId?: string | null;
  matchKind?: ResolveMezzoFromSchedaResult["matchKind"];
  identDelta?: Record<string, { scheda?: string; mezzo?: string }>;
  stage?: string;
  extra?: Record<string, unknown>;
};

function auditEnabled(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "test") return false;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return false;
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage?.getItem("INTERVENTO_AUDIT") === "1") return true;
    } catch {
      /* ignore */
    }
  }
  return typeof process === "undefined" || process.env?.NODE_ENV === "development";
}

export function auditInterventoContext(
  ctx: InterventoContext | null | undefined,
  event: InterventoAuditEvent,
  payload: InterventoAuditPayload = {},
): void {
  if (!auditEnabled()) return;

  const contextId = payload.contextId ?? ctx?.contextId ?? "unknown";
  const mismatch = payload.mismatch ?? ctx?.meta.hasIdentMismatch ?? false;
  const sourceOfTruthUsed =
    payload.sourceOfTruthUsed ??
    (ctx?.schedaIngresso.present ? "scheda" : ctx?.mezzo.present ? "mezzo" : "lavorazione");

  const parts = [
    "[INTERVENTO_AUDIT]",
    `event=${event}`,
    `contextId=${contextId}`,
    `mismatch=${mismatch}`,
    `sourceOfTruthUsed=${sourceOfTruthUsed}`,
  ];

  if (payload.copyMode) parts.push(`copyMode=${payload.copyMode}`);
  if (payload.candidateCount != null) parts.push(`candidateCount=${payload.candidateCount}`);
  if (payload.preferredMezzoId != null) parts.push(`preferredMezzoId=${payload.preferredMezzoId || "—"}`);
  if (payload.resolvedMezzoId != null) parts.push(`resolvedMezzoId=${payload.resolvedMezzoId || "—"}`);
  if (payload.matchKind) parts.push(`matchKind=${payload.matchKind}`);
  if (payload.stage) parts.push(`stage=${payload.stage}`);
  if (payload.identDelta && Object.keys(payload.identDelta).length) {
    parts.push(`identDelta=${JSON.stringify(payload.identDelta)}`);
  }
  if (payload.extra && Object.keys(payload.extra).length) {
    parts.push(`extra=${JSON.stringify(payload.extra)}`);
  }

  console.info(parts.join(" "));
}

export function buildIdentDeltaFromContext(ctx: InterventoContext): Record<string, { scheda?: string; mezzo?: string }> {
  const delta: Record<string, { scheda?: string; mezzo?: string }> = {};
  const c = ctx.schedaIngresso.campi;
  if (!c || !ctx.mezzo.present) return delta;

  for (const key of ["targa", "matricola", "nScuderia"] as const) {
    const schedaVal = (key === "nScuderia" ? c.nScuderia : c[key]).trim();
    const mezzoVal = (key === "nScuderia" ? ctx.mezzo.nScuderia : ctx.mezzo[key]).trim();
    if (schedaVal && mezzoVal && schedaVal.toLowerCase() !== mezzoVal.toLowerCase()) {
      delta[key] = { scheda: schedaVal, mezzo: mezzoVal };
    }
  }
  return delta;
}
