import type { LavorazioneSchedeStore } from "@/types/schede";

/** SSOT transizioni assegnazione manuale lavorazione (capture modal). */
export type ManualAssignState =
  | { status: "idle" }
  | { status: "selected"; id: string }
  | { status: "assigning"; id: string }
  | { status: "review"; id: string };

export function resolveInitialManualAssignState(
  pendingAssignLavorazioneId?: string | null,
): ManualAssignState {
  if (pendingAssignLavorazioneId) {
    return { status: "review", id: pendingAssignLavorazioneId };
  }
  return { status: "idle" };
}

export function manualAssignSelectedId(state: ManualAssignState): string | null {
  if (state.status === "idle") return null;
  return state.id;
}

export function selectManualAssignLavorazione(
  state: ManualAssignState,
  id: string,
): ManualAssignState {
  if (state.status === "assigning") return state;
  if (state.status === "review") return state;
  return { status: "selected", id };
}

export function startManualAssign(state: ManualAssignState, id: string): ManualAssignState {
  return { status: "assigning", id };
}

export function completeManualAssignReview(id: string): ManualAssignState {
  return { status: "review", id };
}

export function revertManualAssigning(state: ManualAssignState): ManualAssignState {
  if (state.status !== "assigning") return state;
  return { status: "selected", id: state.id };
}

export function clearManualAssignSelection(state: ManualAssignState): ManualAssignState {
  if (state.status === "review") return state;
  return { status: "idle" };
}

export type LavorazioneAssignRowParts = {
  codice: string;
  cliente: string;
  identLine: string;
};

export function describeLavorazioneAssignRowParts(
  lavorazioneId: string,
  attive: readonly { id: string; codice?: string | null; cliente?: string | null; macchina?: string | null }[],
  schedeStore: LavorazioneSchedeStore,
): LavorazioneAssignRowParts {
  const lav = attive.find((row) => row.id === lavorazioneId);
  const campi = schedeStore[lavorazioneId]?.ingresso?.campi;
  const codice = lav?.codice?.trim() ?? "";
  const cliente = (campi?.cliente?.trim() || lav?.cliente?.trim()) ?? "";
  const identBits = [campi?.targa, campi?.matricola, campi?.nScuderia, lav?.macchina]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v && v !== "—");
  return {
    codice,
    cliente,
    identLine: identBits.join(" · "),
  };
}

export function filterAttiveForManualAssign(
  attive: readonly { id: string }[],
  query: string,
  labelFor: (id: string) => string,
): { id: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...attive];
  return attive.filter((lav) => {
    const label = labelFor(lav.id).toLowerCase();
    return label.includes(q) || lav.id.includes(q);
  });
}
