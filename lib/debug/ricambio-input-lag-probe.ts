const SESSION = "929eab";
const INGEST =
  "http://127.0.0.1:7662/ingest/191e4801-c810-4957-b192-301c6ab4b769";

/** Client-safe debug probe (fetch only — no node:fs). */
export function probeRicambioInputLag(
  location: string,
  hypothesisId: string,
  data: Record<string, unknown>,
  runId = "input-lag",
): void {
  const line = {
    sessionId: SESSION,
    runId,
    hypothesisId,
    location,
    message: "ricambio input lag probe",
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  fetch(INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION,
    },
    body: JSON.stringify(line),
  }).catch(() => {});
  // #endregion
}
