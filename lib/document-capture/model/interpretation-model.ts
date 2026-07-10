/** Modello derivato — rigenerabile (INV-12). */

export type InterventionFingerprint = {
  cliente?: string;
  targa?: string;
  matricola?: string;
  dataIngresso?: string;
};

export type InterventionCandidate = {
  id: string;
  fingerprint: InterventionFingerprint;
  fieldRefs: { key: string; pageIndex?: number }[];
  pageRefs: number[];
  confidence: number;
};

export type SemanticDuplicateSignal =
  | "same_mezzo"
  | "same_cliente"
  | "same_day"
  | "same_matricola"
  | "similar_righe";

export type SemanticDuplicateCandidate = {
  existingLavorazioneId: string;
  matchScore: number;
  signals: SemanticDuplicateSignal[];
};

export type DomainActionType = "split" | "merge" | "link_existing" | "create_new";

export type DomainAction = {
  type: DomainActionType;
  message: string;
  interventionId?: string;
  targetLavorazioneId?: string;
};

export type InterpretationModel = {
  interventionCandidates: InterventionCandidate[];
  semanticDuplicates: SemanticDuplicateCandidate[];
  suggestedActions: DomainAction[];
};
