export type GeminiErrorType =
  | "CONFIG_NOT_FOUND"
  | "CONFIG_EMPTY"
  | "CONFIG_INVALID_FORMAT"
  | "CLIENT_INIT_FAILED"
  | "SDK_INIT_FAILED"
  | "AUTH_INVALID_KEY"
  | "AUTH_FORBIDDEN"
  | "MODEL_NOT_FOUND"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export function classifyGeminiError(error: unknown): GeminiErrorType {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  const name = error instanceof Error ? error.name : "";

  if (name === "TimeoutError" || upper.includes("TIMEOUT") || upper.includes("ABORT")) {
    return "TIMEOUT";
  }
  if (upper.includes("401") || upper.includes("INVALID API KEY") || upper.includes("UNAUTHENTICATED")) {
    return "AUTH_INVALID_KEY";
  }
  if (upper.includes("403") || upper.includes("PERMISSION_DENIED") || upper.includes("FORBIDDEN")) {
    return "AUTH_FORBIDDEN";
  }
  if (upper.includes("404") || /not found for api version/i.test(text) || /no longer available/i.test(text)) {
    return "MODEL_NOT_FOUND";
  }
  if (upper.includes("429") || upper.includes("RESOURCE_EXHAUSTED") || upper.includes("QUOTA")) {
    return "QUOTA_EXCEEDED";
  }
  if (upper.includes("RATE LIMIT") || upper.includes("TOO MANY REQUESTS")) {
    return "RATE_LIMIT";
  }
  if (
    upper.includes("ECONNREFUSED") ||
    upper.includes("ENOTFOUND") ||
    upper.includes("ETIMEDOUT") ||
    upper.includes("FETCH FAILED") ||
    upper.includes("NETWORK")
  ) {
    return "NETWORK_ERROR";
  }
  return "UNKNOWN";
}
