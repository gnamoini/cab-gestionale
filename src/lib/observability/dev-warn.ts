import { gestionaleLogger } from "@/lib/observability/logger";

const warnedOnce = new Set<string>();

function shouldLog(scope: string, oncePerSession: boolean): boolean {
  if (process.env.NEXT_PUBLIC_CAB_OPS_WARN === "1") return oncePerSession ? !warnedOnce.has(scope) : true;
  if (process.env.NODE_ENV === "production") return false;
  return oncePerSession ? !warnedOnce.has(scope) : true;
}

/** @deprecated Preferire `gestionaleLogger` / `trackRuntimeEvent`. */
export function cabDevWarn(
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
  options?: { oncePerSession?: boolean },
): void {
  const once = options?.oncePerSession ?? false;
  if (!shouldLog(scope, once)) return;
  if (once) warnedOnce.add(scope);
  gestionaleLogger.warn(message, { operation: "system", meta: { scope, ...meta } });
}
