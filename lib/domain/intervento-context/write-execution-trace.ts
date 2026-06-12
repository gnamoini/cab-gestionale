import type { InterventoWriteResult } from "@/lib/domain/intervento-context/intervento-write-types";

export type WriteExecutionTraceMode = "v1" | "v2_shadow" | "v2_saga" | "rpc_atomic";

export type WriteExecutionTraceStepStatus = "started" | "completed" | "skipped" | "failed";

export type WriteExecutionTraceStepName =
  | "v1_create"
  | "v1_persist"
  | "v2_shadow_start"
  | "v2_saga_start"
  | "rpc_atomic_call"
  | "finalize";

export type WriteExecutionTraceStep = {
  step: WriteExecutionTraceStepName;
  status: WriteExecutionTraceStepStatus;
  timestamp: number;
};

export type WriteExecutionTrace = {
  writeId: string;
  mode: WriteExecutionTraceMode;
  startedAt: number;
  steps: WriteExecutionTraceStep[];
  result: {
    success: boolean;
    interventionId?: string;
    error?: string;
  };
  finalizedAt: number | null;
  isFinal: boolean;
};

export type InterventoWriteExecutionOutcome = {
  result: InterventoWriteResult;
  trace: WriteExecutionTrace;
};

function generateWriteId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `write-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function warnBlockedMutation(trace: WriteExecutionTrace, label: string): void {
  if (process.env.INTERVENTO_WRITE_DEBUG !== "1") return;
  console.warn(`[intervento-write-trace] blocked mutation: ${label}`);
}

function isTraceMutable(trace: WriteExecutionTrace | undefined): trace is WriteExecutionTrace {
  if (!trace) return false;
  if (trace.isFinal) {
    warnBlockedMutation(trace, "trace already final");
    return false;
  }
  return true;
}

export function createWriteExecutionTrace(initialMode: WriteExecutionTraceMode): WriteExecutionTrace {
  return {
    writeId: generateWriteId(),
    mode: initialMode,
    startedAt: Date.now(),
    steps: [],
    result: { success: false },
    finalizedAt: null,
    isFinal: false,
  };
}

export function setTraceMode(trace: WriteExecutionTrace | undefined, mode: WriteExecutionTraceMode): void {
  if (!isTraceMutable(trace)) return;
  trace.mode = mode;
}

export function recordTraceStep(
  trace: WriteExecutionTrace | undefined,
  step: WriteExecutionTraceStepName,
  status: WriteExecutionTraceStepStatus,
): void {
  if (!trace) return;
  if (trace.isFinal) {
    warnBlockedMutation(trace, step);
    return;
  }
  const last = trace.steps[trace.steps.length - 1];
  if (last?.step === step && status !== "started") {
    last.status = status;
    last.timestamp = Date.now();
    return;
  }
  trace.steps.push({ step, status, timestamp: Date.now() });
}

function populateTraceResult(trace: WriteExecutionTrace, result: InterventoWriteResult): void {
  if (result.ok) {
    trace.result = {
      success: true,
      interventionId: result.lavorazioneId,
    };
    return;
  }
  trace.result = {
    success: false,
    interventionId: result.lavorazioneId,
    error: result.error,
  };
}

export function finalizeTrace(trace: WriteExecutionTrace, result: InterventoWriteResult): void {
  if (trace.isFinal) return;
  populateTraceResult(trace, result);
  trace.isFinal = true;
  trace.finalizedAt = Date.now();
  logWriteExecutionTraceIfDebug(trace);
}

/** @deprecated Prefer `finalizeTrace` — kept for backward compatibility. */
export function finalizeWriteTrace(trace: WriteExecutionTrace, result: InterventoWriteResult): void {
  finalizeTrace(trace, result);
}

export function logWriteExecutionTraceIfDebug(trace: WriteExecutionTrace): void {
  if (process.env.INTERVENTO_WRITE_DEBUG !== "1") return;
  console.info(JSON.stringify(trace));
}
