import {
  CAPTURE_PIPELINE_VERSION,
  CAPTURE_PIPELINE_VERSION_HEADER,
} from "@/lib/document-capture/orchestrator/capture-pipeline-version";
import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";
import { createClientPipelineWatchdog } from "@/lib/document-capture/orchestrator/pipeline-watchdog";
import {
  consumeCaptureAnalyzeNdjsonStream,
  CAPTURE_ANALYZE_NDJSON_ACCEPT,
  type ConsumeCaptureAnalyzeStreamResult,
} from "@/lib/document-capture/pipeline/analyze-stream-client";
import type { CaptureAnalyzeStreamEvent } from "@/lib/document-capture/pipeline/analyze-stream-events";

export type CapturePipelineResult = ConsumeCaptureAnalyzeStreamResult & {
  response: Response;
  terminalState: CapturePipelineTerminalState;
  executionId: string | null;
  pipelineVersion: string;
};

type InFlightExecution = {
  captureId: string;
  pipelineVersion: string;
  executionId: string;
  promise: Promise<CapturePipelineResult>;
  abortController: AbortController;
  startedAt: number;
};

const inFlight = new Map<string, InFlightExecution>();

function inFlightKey(captureId: string, pipelineVersion: string): string {
  return `${captureId}:${pipelineVersion}`;
}

export function getInFlightCaptureExecution(
  captureId: string,
  pipelineVersion = CAPTURE_PIPELINE_VERSION,
): InFlightExecution | null {
  return inFlight.get(inFlightKey(captureId, pipelineVersion)) ?? null;
}

export function cancelInFlightCaptureExecution(captureId: string, pipelineVersion?: string): void {
  const keys = pipelineVersion
    ? [inFlightKey(captureId, pipelineVersion)]
    : [...inFlight.keys()].filter((k) => k.startsWith(`${captureId}:`));
  for (const key of keys) {
    const entry = inFlight.get(key);
    entry?.abortController.abort();
    inFlight.delete(key);
  }
}

async function executeCaptureProcess(
  captureId: string,
  signal: AbortSignal,
  onEvent?: (event: CaptureAnalyzeStreamEvent) => void,
  options?: { uploadDurationMs?: number },
): Promise<CapturePipelineResult> {
  const headers: Record<string, string> = {
    Accept: CAPTURE_ANALYZE_NDJSON_ACCEPT,
    [CAPTURE_PIPELINE_VERSION_HEADER]: CAPTURE_PIPELINE_VERSION,
  };
  if (options?.uploadDurationMs != null) {
    headers["x-capture-upload-duration-ms"] = String(options.uploadDurationMs);
  }

  let terminalState: CapturePipelineTerminalState | null = null;
  let executionId: string | null = null;

  const watchdog = createClientPipelineWatchdog({
    onTimeout: () => {
      if (!terminalState) terminalState = "failed";
    },
  });

  try {
    const response = await fetch(`/api/document-capture/${captureId}/process`, {
      method: "POST",
      headers,
      signal,
    });

    const parsed = await consumeCaptureAnalyzeNdjsonStream(response, (event) => {
      watchdog.touch();
      if (event.type === "terminal") {
        terminalState = event.terminalState;
        executionId = event.execution.executionId;
      }
      if (event.type === "result" && event.execution?.executionId) {
        executionId = event.execution.executionId;
      }
      onEvent?.(event);
    });

    if (!terminalState) {
      if (parsed.terminalState) {
        terminalState = parsed.terminalState;
      } else if (parsed.ok) {
        terminalState = "completed";
      } else {
        terminalState = "failed";
        parsed.body = {
          ...parsed.body,
          code: "STREAM_ENDED_WITHOUT_TERMINAL",
          ok: false,
          error: "Stream terminato senza stato finale.",
        };
        parsed.ok = false;
      }
    }

    return {
      ...parsed,
      response,
      terminalState,
      executionId: executionId ?? parsed.executionId ?? null,
      pipelineVersion: CAPTURE_PIPELINE_VERSION,
    };
  } finally {
    watchdog.dispose();
  }
}

export function runCaptureExecution(input: {
  captureId: string;
  pipelineVersion?: string;
  onEvent?: (event: CaptureAnalyzeStreamEvent) => void;
  uploadDurationMs?: number;
}): Promise<CapturePipelineResult> {
  const pipelineVersion = input.pipelineVersion ?? CAPTURE_PIPELINE_VERSION;
  const key = inFlightKey(input.captureId, pipelineVersion);
  const existing = inFlight.get(key);
  if (existing) return existing.promise;

  const abortController = new AbortController();
  const executionId = crypto.randomUUID();
  const entry: InFlightExecution = {
    captureId: input.captureId,
    pipelineVersion,
    executionId,
    abortController,
    startedAt: Date.now(),
    promise: executeCaptureProcess(
      input.captureId,
      abortController.signal,
      input.onEvent,
      { uploadDurationMs: input.uploadDurationMs },
    ).finally(() => {
      inFlight.delete(key);
    }),
  };
  inFlight.set(key, entry);
  return entry.promise;
}

export async function postCaptureProcessStream(
  captureId: string,
  onEvent?: (event: CaptureAnalyzeStreamEvent) => void,
  options?: { uploadDurationMs?: number },
): Promise<CapturePipelineResult> {
  return runCaptureExecution({
    captureId,
    onEvent,
    uploadDurationMs: options?.uploadDurationMs,
  });
}
