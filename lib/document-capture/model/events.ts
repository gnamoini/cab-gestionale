/** Eventi dominio + audit utente — INV-18. */

export type DocumentCaptureDomainEvent =
  | "UploadCompleted"
  | "PhysicalParseCompleted"
  | "AnalyzeRequested"
  | "AnalyzeCompleted"
  | "ProjectCompleted"
  | "ValidationCompleted"
  | "InterpretationCompleted"
  | "WizardReady"
  | "DocumentEdited"
  | "FieldOverridden"
  | "ValidationReviewed"
  | "ApplyApproved"
  | "ApplyStarted"
  | "ApplyCompleted"
  | "ApplyFailed"
  | "ApplyPartial";

export type FieldOverriddenPayload = {
  userId: string;
  fieldKey: string;
  previousValue: string | null;
  newValue: string | null;
  overrideReason?: string;
  pageIndex?: number;
};
