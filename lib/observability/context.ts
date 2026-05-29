import type { LogContext, ObsOperation } from "@/lib/observability/types";

let globalContext: LogContext = {
  userId: "anon",
  route: "/",
  operation: "system",
};

export function getObsContext(): Readonly<LogContext> {
  return globalContext;
}

export function setObsContext(partial: Partial<LogContext>): void {
  globalContext = { ...globalContext, ...partial };
}

/** Deriva operation da pathname (prefisso route). */
export function operationFromRoute(pathname: string): ObsOperation {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (path.startsWith("/dashboard/security") || path.startsWith("/login")) return "auth";
  if (path.startsWith("/report")) return "report";
  if (path.startsWith("/documenti")) return "documenti";
  if (path.startsWith("/lavorazioni") || path.startsWith("/preventivi") || path.startsWith("/magazzino") || path.startsWith("/mezzi") || path.startsWith("/bunder")) {
    return "crud";
  }
  if (path.startsWith("/impostazioni")) return "system";
  if (path.startsWith("/dashboard")) return "crud";
  return "system";
}
