import type { AiErrorCode } from "@/lib/ai/runtime/types";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace.server";

export type CaptureAnalyzeErrorCode =
  | AiErrorCode
  | "STORAGE_DOWNLOAD"
  | "PHYSICAL_PARSE"
  | "SCHEMA_VALIDATION"
  | "DATABASE_WRITE"
  | "PREREQUISITES"
  | "ANALYZE_TIMEOUT";

export class CaptureAnalyzeError extends Error {
  readonly code: CaptureAnalyzeErrorCode;
  readonly phase: AnalyzeTracePhase;
  readonly userMessage: string;
  readonly detail: string;

  constructor(input: {
    code: CaptureAnalyzeErrorCode;
    phase: AnalyzeTracePhase;
    userMessage: string;
    detail: string;
    cause?: unknown;
  }) {
    super(input.detail);
    this.name = "CaptureAnalyzeError";
    this.code = input.code;
    this.phase = input.phase;
    this.userMessage = input.userMessage;
    this.detail = input.detail;
    if (input.cause instanceof Error && input.cause.stack) {
      this.stack = input.cause.stack;
    }
  }
}

export class StorageAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string, phase: AnalyzeTracePhase = "DOWNLOAD_STORAGE_FAIL") {
    super({
      code: "STORAGE_DOWNLOAD",
      phase,
      userMessage: detail,
      detail,
    });
    this.name = "StorageAnalyzeError";
  }
}

export class GeminiAnalyzeError extends CaptureAnalyzeError {
  constructor(code: AiErrorCode, detail: string, phase: AnalyzeTracePhase = "GEMINI_FAIL") {
    super({
      code,
      phase,
      userMessage: aiErrorMessage(code),
      detail,
    });
    this.name = "GeminiAnalyzeError";
  }
}

export class ParsingAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string, phase: AnalyzeTracePhase = "PARSE_FAIL") {
    super({
      code: "PHYSICAL_PARSE",
      phase,
      userMessage: detail,
      detail,
    });
    this.name = "ParsingAnalyzeError";
  }
}

export class ValidationAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string) {
    super({
      code: "SCHEMA_VALIDATION",
      phase: "PARSE_FAIL",
      userMessage: "Risposta AI non valida. Riprova con un documento più nitido.",
      detail,
    });
    this.name = "ValidationAnalyzeError";
  }
}

export class CompileAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string) {
    super({
      code: "AI_UNKNOWN_ERROR",
      phase: "UPSERT_FIELDS_FAIL",
      userMessage: "Salvataggio dati letti non riuscito.",
      detail,
    });
    this.name = "CompileAnalyzeError";
  }
}

export class AnalyzeTimeoutError extends CaptureAnalyzeError {
  constructor(detail: string) {
    super({
      code: "ANALYZE_TIMEOUT",
      phase: "END_FAIL",
      userMessage: "Timeout durante l'analisi. Riduci il documento o riprova.",
      detail,
    });
    this.name = "AnalyzeTimeoutError";
  }
}

export class NetworkAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string) {
    super({
      code: "AI_PROVIDER_DOWN",
      phase: "GEMINI_FAIL",
      userMessage: "Provider AI temporaneamente non raggiungibile. Riprova tra poco.",
      detail,
    });
    this.name = "NetworkAnalyzeError";
  }
}

export class PrerequisitesAnalyzeError extends CaptureAnalyzeError {
  constructor(detail: string) {
    super({
      code: "PREREQUISITES",
      phase: "PREREQUISITES_FAIL",
      userMessage: detail,
      detail,
    });
    this.name = "PrerequisitesAnalyzeError";
  }
}

export function isCaptureAnalyzeError(error: unknown): error is CaptureAnalyzeError {
  return error instanceof CaptureAnalyzeError;
}

export function errorDetailFromUnknown(error: unknown): string {
  if (error instanceof CaptureAnalyzeError) return error.detail;
  if (error instanceof Error) return error.message;
  return String(error);
}
