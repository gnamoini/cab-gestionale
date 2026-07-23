import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

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
  /** Cliente · cantiere · marca modello attrezzatura */
  headlineLine: string;
  /** N. scuderia · targa · matricola */
  identLine: string;
};

const ASSIGN_LABEL_SEP = " · ";

function assignLabelSegment(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  return t && t !== "—" ? t : "";
}

function joinAssignLabelParts(...parts: string[]): string {
  return parts.map(assignLabelSegment).filter(Boolean).join(ASSIGN_LABEL_SEP);
}

function resolveMarcaModelloAttrezzatura(
  campi: SchedaIngressoFields | undefined,
  lav: { macchina?: string | null } | undefined,
): string {
  const marca = assignLabelSegment(campi?.marcaAttrezzatura);
  const modello = assignLabelSegment(campi?.modelloAttrezzatura);
  const mm = [marca, modello].filter(Boolean).join(" ").trim();
  return mm || assignLabelSegment(lav?.macchina);
}

type LavorazioneAssignLavFallback = {
  cliente?: string | null;
  macchina?: string | null;
  cantiere?: string | null;
  targa?: string | null;
  matricola?: string | null;
  nScuderia?: string | null;
};

export function describeLavorazioneAssignRowPartsFromCampi(
  codice: string,
  campi: SchedaIngressoFields | undefined,
  lav?: LavorazioneAssignLavFallback | null,
): LavorazioneAssignRowParts {
  const cliente = assignLabelSegment(campi?.cliente) || assignLabelSegment(lav?.cliente);
  const cantiere = assignLabelSegment(campi?.cantiere) || assignLabelSegment(lav?.cantiere);
  const marcaModello = resolveMarcaModelloAttrezzatura(campi, lav ?? undefined);
  const scuderia = assignLabelSegment(campi?.nScuderia) || assignLabelSegment(lav?.nScuderia);
  const targa = assignLabelSegment(campi?.targa) || assignLabelSegment(lav?.targa);
  const matricola = assignLabelSegment(campi?.matricola) || assignLabelSegment(lav?.matricola);
  return {
    codice: codice.trim(),
    headlineLine: joinAssignLabelParts(cliente, cantiere, marcaModello),
    identLine: joinAssignLabelParts(scuderia, targa, matricola),
  };
}

export function describeLavorazioneAssignRowParts(
  lavorazioneId: string,
  attive: readonly ({ id: string; codice?: string | null } & LavorazioneAssignLavFallback)[],
  schedeStore: LavorazioneSchedeStore,
): LavorazioneAssignRowParts {
  const lav = attive.find((row) => row.id === lavorazioneId);
  const campi = schedeStore[lavorazioneId]?.ingresso?.campi;
  const codice = lav?.codice?.trim() ?? "";
  return describeLavorazioneAssignRowPartsFromCampi(codice, campi, lav);
}

/** Etichetta piatta per ricerca, toast e conferme (segmenti uniti con ·). */
export function describeLavorazioneAssignLabel(
  lavorazioneId: string,
  attive: Parameters<typeof describeLavorazioneAssignRowParts>[1],
  schedeStore: LavorazioneSchedeStore,
): string {
  const parts = describeLavorazioneAssignRowParts(lavorazioneId, attive, schedeStore);
  const flat = [parts.headlineLine, parts.identLine].filter(Boolean).join(ASSIGN_LABEL_SEP);
  return flat || "lavorazione in corso";
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
