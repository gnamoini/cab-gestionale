"use client";

import { useCallback, useState } from "react";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";
import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";
import { runCaptureExecution } from "@/lib/document-capture/capture-execution-store";
import { captureAnalyzeProgressPercent } from "@/lib/document-capture/pipeline/analyze-progress-labels";

export type CapturePipelineObserverState = {
  busy: boolean;
  terminalState: CapturePipelineTerminalState | null;
  currentPhase: AnalyzeTracePhase | null;
  progress: number;
  error: string | null;
  executionId: string | null;
};

export function useCapturePipeline(captureId: string | null) {
  const [state, setState] = useState<CapturePipelineObserverState>({
    busy: false,
    terminalState: null,
    currentPhase: null,
    progress: 0,
    error: null,
    executionId: null,
  });

  const reset = useCallback(() => {
    setState({
      busy: false,
      terminalState: null,
      currentPhase: null,
      progress: 0,
      error: null,
      executionId: null,
    });
  }, []);

  const runProcess = useCallback(
    async (captureIdOverride?: string | null, uploadDurationMs?: number): Promise<boolean> => {
      const id = captureIdOverride ?? captureId;
      if (!id) return false;

      setState((s) => ({
        ...s,
        busy: true,
        error: null,
        terminalState: null,
        currentPhase: null,
        progress: 0,
      }));

      try {
        const result = await runCaptureExecution({
          captureId: id,
          uploadDurationMs,
          onEvent: (event) => {
            if (event.type === "phase") {
              setState((s) => ({
                ...s,
                currentPhase: event.phase,
                progress: captureAnalyzeProgressPercent(event.phase),
              }));
            }
            if (event.type === "terminal") {
              setState((s) => ({
                ...s,
                terminalState: event.terminalState,
                executionId: event.execution.executionId,
              }));
            }
          },
        });

        const body = result.body as { error?: string; code?: string; ok?: boolean };
        if (!result.ok || body.ok === false) {
          const msg = body.error ?? "Lettura documento non riuscita";
          setState((s) => ({
            ...s,
            busy: false,
            error: msg,
            terminalState: result.terminalState ?? "failed",
            executionId: result.executionId,
          }));
          return false;
        }

        setState((s) => ({
          ...s,
          busy: false,
          error: null,
          terminalState: result.terminalState ?? "completed",
          executionId: result.executionId,
        }));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Errore durante la lettura";
        setState((s) => ({
          ...s,
          busy: false,
          error: msg,
          terminalState: "failed",
        }));
        return false;
      }
    },
    [captureId],
  );

  return { ...state, runProcess, reset };
}
