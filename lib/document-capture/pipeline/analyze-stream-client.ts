import {
  parseCaptureAnalyzeNdjsonLine,
  CAPTURE_ANALYZE_NDJSON_ACCEPT,
  type CaptureAnalyzeStreamEvent,
} from "@/lib/document-capture/pipeline/analyze-stream-events";
import type { AnalyzeTracePhase } from "@/lib/document-capture/pipeline/analyze-trace-types";
import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";

export type ConsumeCaptureAnalyzeStreamResult = {
  ok: boolean;
  body: Record<string, unknown>;
  lastPhase: AnalyzeTracePhase | null;
  terminalState?: CapturePipelineTerminalState | null;
  executionId?: string | null;
};

export async function consumeCaptureAnalyzeNdjsonStream(
  response: Response,
  onEvent?: (event: CaptureAnalyzeStreamEvent) => void,
): Promise<ConsumeCaptureAnalyzeStreamResult> {
  if (!response.body) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: Boolean(body.ok), body, lastPhase: null };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastPhase: AnalyzeTracePhase | null = null;
  let terminalState: CapturePipelineTerminalState | null = null;
  let executionId: string | null = null;
  let result: ConsumeCaptureAnalyzeStreamResult = { ok: false, body: {}, lastPhase: null };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseCaptureAnalyzeNdjsonLine(line);
      if (!event) continue;
      onEvent?.(event);
      if (event.type === "phase") {
        lastPhase = event.phase;
      }
      if (event.type === "terminal") {
        terminalState = event.terminalState;
        executionId = event.execution.executionId;
      }
      if (event.type === "result") {
        result = {
          ok: event.ok,
          body: event.body,
          lastPhase,
          terminalState,
          executionId: event.execution?.executionId ?? executionId,
        };
      }
    }
  }

  if (buffer.trim()) {
    const event = parseCaptureAnalyzeNdjsonLine(buffer);
    if (event) {
      onEvent?.(event);
      if (event.type === "phase") lastPhase = event.phase;
      if (event.type === "terminal") {
        terminalState = event.terminalState;
        executionId = event.execution.executionId;
      }
      if (event.type === "result") {
        result = {
          ok: event.ok,
          body: event.body,
          lastPhase,
          terminalState,
          executionId: event.execution?.executionId ?? executionId,
        };
      }
    }
  }

  if (!terminalState && result.ok) {
    terminalState = "completed";
  }
  if (!terminalState && !result.ok) {
    terminalState = "failed";
  }

  return { ...result, lastPhase, terminalState, executionId };
}

export { CAPTURE_ANALYZE_NDJSON_ACCEPT };
