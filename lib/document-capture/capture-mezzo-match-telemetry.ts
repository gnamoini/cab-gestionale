import type { MatchStrength } from "@/lib/document-capture/capture-mezzo-catalog-match";
import type { CaptureIngressoContextPriority } from "@/lib/document-capture/resolve-capture-ingresso-context";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

export type CaptureMezzoMatchTelemetryPayload = {
  confidence: number;
  matchStrength: MatchStrength;
  candidateCount: number;
  confirmed: boolean;
  dismissed: boolean;
  forceNewMezzo: boolean;
  conflictsCount: number;
  priority: CaptureIngressoContextPriority;
};

export function traceCaptureMezzoMatchResult(payload: CaptureMezzoMatchTelemetryPayload): void {
  incrementHealthCounter("captureMezzoMatchResult");
  if (payload.confirmed) incrementHealthCounter("captureMezzoMatchConfirmed");
  if (payload.dismissed) incrementHealthCounter("captureMezzoMatchDismissed");
  if (payload.forceNewMezzo) incrementHealthCounter("captureMezzoMatchForceNew");
  if (payload.conflictsCount > 0) incrementHealthCounter("captureMezzoMatchWithConflicts");

  if (typeof window !== "undefined" && "dispatchEvent" in window) {
    window.dispatchEvent(
      new CustomEvent("capture_mezzo_match_result", {
        detail: payload,
      }),
    );
  }
}
