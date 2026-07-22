import type { DocumentCaptureFlowStep } from "@/components/document-capture/document-capture-step-indicator";
import type { CaptureSchedaCompilePayload, CaptureFieldPatch } from "@/lib/document-capture/capture-scheda-compile-payload";
import type { SchedaTipo, SchedaIngressoFields } from "@/types/schede";

const STORAGE_KEY = "gestionale:capture-acquisition-draft";

export type CaptureIngressoCompileDraft = {
  fields: SchedaIngressoFields;
  meta: {
    stato: string;
    priorita: string;
    mezzoId: string;
  };
};

export type CaptureSchedaCompileDraft = {
  payload: CaptureSchedaCompilePayload;
  baseline: CaptureFieldPatch[];
};

export type CaptureCompileDraft = {
  captureId: string;
  mode: "ingresso" | "sheet";
  payload: CaptureIngressoCompileDraft | CaptureSchedaCompilePayload;
  baseline: CaptureFieldPatch[];
  updatedAt: string;
};

export type CaptureAcquisitionDraft = {
  captureId: string;
  step: Exclude<DocumentCaptureFlowStep, "hub">;
  compileView: "ingresso" | "mezzo-match" | "sheet-compile";
  pendingSchedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi"> | null;
  /** Bozza form scheda ingresso (modifiche manuali in compilazione). */
  ingressoCompile?: CaptureIngressoCompileDraft;
  /** Bozza compile scheda lavorazioni/ricambi. */
  sheetCompile?: CaptureSchedaCompileDraft;
  pendingMultiSchedaQueue?: Array<Extract<SchedaTipo, "lavorazioni" | "ricambi">>;
  multiSchedaPromptDismissed?: boolean;
  savedAt: number;
};

function isSchedaTipo(value: unknown): value is Extract<SchedaTipo, "lavorazioni" | "ricambi"> {
  return value === "lavorazioni" || value === "ricambi";
}

function isIngressoCompileDraft(value: unknown): value is CaptureIngressoCompileDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return Boolean(d.fields && typeof d.fields === "object" && d.meta && typeof d.meta === "object");
}

function isSchedaCompileDraft(value: unknown): value is CaptureSchedaCompileDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  if (!d.payload || typeof d.payload !== "object") return false;
  const p = d.payload as Record<string, unknown>;
  if (p.schemaVersion !== 1 || typeof p.captureId !== "string" || (p.tipo !== "lavorazioni" && p.tipo !== "ricambi")) {
    return false;
  }
  if (!Array.isArray(d.baseline)) return false;
  return true;
}

function isDraftShape(value: unknown): value is CaptureAcquisitionDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  if (
    typeof d.captureId !== "string" ||
    d.captureId.length === 0 ||
    (d.step !== "analyze" && d.step !== "compile") ||
    (d.compileView !== "ingresso" && d.compileView !== "mezzo-match" && d.compileView !== "sheet-compile") ||
    (d.pendingSchedaTipo !== null && !isSchedaTipo(d.pendingSchedaTipo))
  ) {
    return false;
  }
  if (d.ingressoCompile !== undefined && !isIngressoCompileDraft(d.ingressoCompile)) return false;
  if (d.sheetCompile !== undefined && !isSchedaCompileDraft(d.sheetCompile)) return false;
  if (d.pendingMultiSchedaQueue !== undefined) {
    if (!Array.isArray(d.pendingMultiSchedaQueue)) return false;
    if (!d.pendingMultiSchedaQueue.every(isSchedaTipo)) return false;
  }
  if (d.multiSchedaPromptDismissed !== undefined && typeof d.multiSchedaPromptDismissed !== "boolean") {
    return false;
  }
  return true;
}

/** Se l'analisi è già completata, salta lo step analyze anche se il draft era su analyze. */
export function captureAcquisitionResumeTargetStep(
  draftStep: CaptureAcquisitionDraft["step"],
  captureStatus?: string | null,
): "analyze" | "compile" {
  if (draftStep === "compile") return "compile";
  if (
    captureStatus &&
    captureStatus !== "analyzing" &&
    captureStatus !== "uploaded" &&
    captureStatus !== "failed"
  ) {
    return "compile";
  }
  return "analyze";
}

export function readCaptureAcquisitionDraft(): CaptureAcquisitionDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftShape(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCaptureAcquisitionDraft(
  draft: Omit<CaptureAcquisitionDraft, "savedAt">,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() } satisfies CaptureAcquisitionDraft),
    );
  } catch {
    // sessionStorage pieno o disabilitato
  }
}

export function clearCaptureAcquisitionDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Verifica che la capture ephemeral sia ancora leggibile lato server. */
export async function captureAcquisitionDraftStillValid(captureId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/document-capture/${captureId}`);
    if (!res.ok) return false;
    const body = (await res.json()) as { capture?: { finalized_at?: string | null } };
    return Boolean(body.capture?.finalized_at);
  } catch {
    return false;
  }
}

export async function readCaptureAcquisitionStatus(
  captureId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`/api/document-capture/${captureId}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { capture?: { status?: string | null } };
    return body.capture?.status ?? null;
  } catch {
    return null;
  }
}
