import { logIngressoSavePipeline } from "@/lib/schede/scheda-ingresso-save-pipeline-log";

export type LavorazioneEditInFlightEntry = {
  runId: number;
  correlationId: string;
  startedAt: number;
};

const inFlight = new Map<string, LavorazioneEditInFlightEntry>();

export function acquireLavorazioneEditFlight(
  lavorazioneId: string,
  runId: number,
  correlationId: string,
): boolean {
  const id = lavorazioneId.trim();
  if (!id) return true;
  const existing = inFlight.get(id);
  if (existing) {
    logIngressoSavePipeline("save_duplicate_blocked", {
      runId,
      correlationId,
      lavorazioneId: id,
      blockedBy: existing,
    });
    return false;
  }
  inFlight.set(id, { runId, correlationId, startedAt: Date.now() });
  return true;
}

export function releaseLavorazioneEditFlight(lavorazioneId: string, runId: number): void {
  const id = lavorazioneId.trim();
  if (!id) return;
  const existing = inFlight.get(id);
  if (existing?.runId === runId) inFlight.delete(id);
}

export function getLavorazioneEditInFlight(lavorazioneId: string): LavorazioneEditInFlightEntry | undefined {
  return inFlight.get(lavorazioneId.trim());
}

/** Test-only reset. */
export function resetLavorazioneEditFlightForTests(): void {
  inFlight.clear();
}
