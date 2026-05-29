import type { LogLevel } from "@/lib/observability/types";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function parseLogLevel(raw: string | undefined): LogLevel | null {
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return null;
}

export function getMinLogLevel(): LogLevel {
  const fromEnv = parseLogLevel(process.env.NEXT_PUBLIC_OBS_LOG_LEVEL?.trim());
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function shouldLogLevel(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[getMinLogLevel()];
}

export function isObsPerfEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OBS_PERF === "1";
}
