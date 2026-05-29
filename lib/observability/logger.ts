import { shouldLogLevel } from "@/lib/observability/config";
import { getObsContext } from "@/lib/observability/context";
import type { LogContext, LogLevel, StructuredLogEntry } from "@/lib/observability/types";

const WARN_DEDUPE_MS = 5000;
const warnDedupe = new Map<string, number>();

function shouldEmitWarn(msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }): boolean {
  const key = `${msg}|${partial?.event ?? ""}|${partial?.route ?? getObsContext().route ?? ""}`;
  const now = Date.now();
  const last = warnDedupe.get(key);
  if (last != null && now - last < WARN_DEDUPE_MS) return false;
  warnDedupe.set(key, now);
  if (warnDedupe.size > 200) {
    const cutoff = now - WARN_DEDUPE_MS;
    for (const [k, t] of warnDedupe) {
      if (t < cutoff) warnDedupe.delete(k);
    }
  }
  return true;
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta || Object.keys(meta).length === 0) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k.toLowerCase().includes("password") || k.toLowerCase().includes("token")) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function emit(level: LogLevel, msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }): void {
  if (!shouldLogLevel(level)) return;
  if (level === "warn" && !shouldEmitWarn(msg, partial)) return;

  const { meta, ...ctxPartial } = partial ?? {};
  const base = getObsContext();
  const entry: StructuredLogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    userId: ctxPartial.userId ?? base.userId,
    route: ctxPartial.route ?? base.route,
    operation: ctxPartial.operation ?? base.operation,
    event: ctxPartial.event,
    durationMs: ctxPartial.durationMs,
    meta: sanitizeMeta(meta),
  };

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "info") console.info(line);
  else console.debug(line);
}

export const gestionaleLogger = {
  debug: (msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }) => emit("debug", msg, partial),
  info: (msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }) => emit("info", msg, partial),
  warn: (msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }) => emit("warn", msg, partial),
  error: (msg: string, partial?: Partial<LogContext> & { meta?: Record<string, unknown> }) => emit("error", msg, partial),
};
