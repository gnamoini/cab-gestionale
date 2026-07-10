import type { ValidationMetadata } from "@/lib/document-capture/model/versions";

export type ValidationSeverity = "error" | "warning";

export type FieldRef = {
  key: string;
  pageIndex?: number;
};

export type ValidationIssue = {
  code: string;
  message: string;
  severity: ValidationSeverity;
  fieldRef?: FieldRef;
  pageIndex?: number;
  ruleId?: string;
};

export type FieldConflict = {
  keys: string[];
  message: string;
};

export type SchedeConflict = {
  namespaces: string[];
  message: string;
};

export type PageTimelineEntry = {
  pageIndex: number;
  classification: string;
  status: "ok" | "warning" | "error";
  label: string;
};

export type ValidationStatus = "valid" | "warnings" | "errors" | "blocked";

export type ValidationResult = {
  status: ValidationStatus;
  documentCompleteness: "complete" | "partial" | "unknown";
  metadata: ValidationMetadata;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  missingRequiredFields: FieldRef[];
  conflictingFields: FieldConflict[];
  pageTimeline: PageTimelineEntry[];
  mixedSchede: SchedeConflict[];
  readyForValidationReview: boolean;
};
