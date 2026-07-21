/**
 * Telemetry stock pipeline — attiva con STOCK_PIPELINE_DIAGNOSTIC=true o post-deploy default log.
 */

export type StockPipelineTelemetrySource =
  | "api_adjust"
  | "stock_engine"
  | "realtime"
  | "merge_cache"
  | "journal"
  | "queue";

export type StockPipelineTelemetryEvent = {
  operationId?: string | null;
  ricambioId?: string | null;
  delta?: number;
  expectedVersion?: number;
  responseVersion?: number;
  source: StockPipelineTelemetrySource;
  timestamp: number;
  detail?: string;
};

const buffer: StockPipelineTelemetryEvent[] = [];
const MAX_BUFFER = 500;

function isTelemetryEnabled(): boolean {
  if (process.env.STOCK_PIPELINE_DIAGNOSTIC === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return process.env.STOCK_PIPELINE_TELEMETRY === "true";
}

export function logStockPipelineEvent(
  event: Omit<StockPipelineTelemetryEvent, "timestamp"> & { timestamp?: number },
): void {
  if (!isTelemetryEnabled()) return;
  const row: StockPipelineTelemetryEvent = {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  };
  buffer.push(row);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[stock-pipeline]", row);
  }
}

export function getStockPipelineTelemetryBuffer(): readonly StockPipelineTelemetryEvent[] {
  return buffer;
}

export function clearStockPipelineTelemetryForTest(): void {
  buffer.length = 0;
}
