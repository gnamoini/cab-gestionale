export type LogLevel = "debug" | "info" | "warn" | "error";

export type ObsOperation =
  | "auth"
  | "rbac"
  | "crud"
  | "documenti"
  | "report"
  | "realtime"
  | "cache"
  | "system";

export type LogContext = {
  userId?: string;
  route?: string;
  operation?: ObsOperation;
  event?: string;
  durationMs?: number;
};

export type StructuredLogEntry = LogContext & {
  ts: string;
  level: LogLevel;
  msg: string;
  meta?: Record<string, unknown>;
};
