import { inferCaptureSchedaTipo } from "@/lib/document-capture/capture-field-mapper";
import type { CaptureFieldRow } from "@/lib/document-capture/capture-field-mapper";
import type { SchedaTipo } from "@/types/schede";

export type CaptureApplyExecutionMode = "CREATE" | "ASSIGN";

export function resolveCaptureApplyExecutionMode(input: {
  existingLavorazioneId: string | null | undefined;
  schedaTipo?: SchedaTipo | null;
}): CaptureApplyExecutionMode {
  if (input.existingLavorazioneId?.trim()) return "ASSIGN";
  return "CREATE";
}

export function resolveCaptureSchedaTipoFromFields(fields: readonly CaptureFieldRow[]): SchedaTipo | null {
  return inferCaptureSchedaTipo(fields);
}
