import type { DocumentCaptureFlowStep } from "@/components/document-capture/document-capture-step-indicator";
import type { SchedaTipo } from "@/types/schede";

const STORAGE_KEY = "gestionale:capture-acquisition-draft";

export type CaptureAcquisitionDraft = {
  captureId: string;
  step: Exclude<DocumentCaptureFlowStep, "hub">;
  compileView: "ingresso" | "mezzo-match";
  pendingSchedaTipo: Extract<SchedaTipo, "lavorazioni" | "ricambi"> | null;
  savedAt: number;
};

function isDraftShape(value: unknown): value is CaptureAcquisitionDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.captureId === "string" &&
    d.captureId.length > 0 &&
    (d.step === "analyze" || d.step === "compile") &&
    (d.compileView === "ingresso" || d.compileView === "mezzo-match") &&
    (d.pendingSchedaTipo === null || d.pendingSchedaTipo === "lavorazioni" || d.pendingSchedaTipo === "ricambi")
  );
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
