import type { PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";

export const PHASE_STALL_MS = 90_000;

export type PipelineWatchdogTimeoutCode =
  | "TIMEOUT_PHASE_VERIFY"
  | "TIMEOUT_PHASE_READ"
  | "TIMEOUT_PHASE_AI"
  | "TIMEOUT_PHASE_PROJECTION"
  | "TIMEOUT_PHASE_VALIDATE";

const PHASE_TIMEOUT_CODES: Partial<Record<PipelinePhase | "verify", PipelineWatchdogTimeoutCode>> = {
  verify: "TIMEOUT_PHASE_VERIFY",
  physical_parse: "TIMEOUT_PHASE_READ",
  ai_extract: "TIMEOUT_PHASE_AI",
  project: "TIMEOUT_PHASE_PROJECTION",
  validate: "TIMEOUT_PHASE_VALIDATE",
};

export function watchdogTimeoutCodeForPhase(
  phase: PipelinePhase | "verify",
): PipelineWatchdogTimeoutCode {
  return PHASE_TIMEOUT_CODES[phase] ?? "TIMEOUT_PHASE_AI";
}

export type PipelineWatchdog = {
  touch: (phase: PipelinePhase | "verify") => void;
  check: () => PipelineWatchdogTimeoutCode | null;
  dispose: () => void;
};

export function createPipelineWatchdog(
  stallMs = PHASE_STALL_MS,
  onTimeout?: (code: PipelineWatchdogTimeoutCode) => void,
): PipelineWatchdog {
  let currentPhase: PipelinePhase | "verify" | null = null;
  let phaseStartedAt = Date.now();
  let disposed = false;

  const touch = (phase: PipelinePhase | "verify") => {
    currentPhase = phase;
    phaseStartedAt = Date.now();
  };

  const check = (): PipelineWatchdogTimeoutCode | null => {
    if (disposed || !currentPhase) return null;
    if (Date.now() - phaseStartedAt < stallMs) return null;
    const code = watchdogTimeoutCodeForPhase(currentPhase);
    onTimeout?.(code);
    return code;
  };

  const dispose = () => {
    disposed = true;
    currentPhase = null;
  };

  return { touch, check, dispose };
}

/** Client-side watchdog when stream stalls without terminal event. */
export function createClientPipelineWatchdog(input: {
  stallMs?: number;
  onTimeout: (code: PipelineWatchdogTimeoutCode) => void;
}): { touch: () => void; dispose: () => void } {
  const stallMs = input.stallMs ?? PHASE_STALL_MS;
  let lastEventAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const touch = () => {
    lastEventAt = Date.now();
  };

  timer = setInterval(() => {
    if (Date.now() - lastEventAt >= stallMs) {
      input.onTimeout("TIMEOUT_PHASE_AI");
    }
  }, 5_000);

  const dispose = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  return { touch, dispose };
}
