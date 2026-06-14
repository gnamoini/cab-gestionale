export type ErrorFallbackVariant = "root" | "gestionale" | "global";

type ErrorKind =
  | "missing_export"
  | "module_not_found"
  | "not_defined"
  | "runtime"
  | "network"
  | "chunk"
  | null;

export function isTechnicalMessage(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (t.includes(" is not defined")) return true;
  if (t.startsWith("Cannot ") || t.startsWith("Failed to ")) return true;
  if (/^(Type|Reference|Syntax)Error:/i.test(t)) return true;
  if (/Export .+ doesn't exist/i.test(t)) return true;
  if (/Module not found/i.test(t)) return true;
  return t.length > 120;
}

function classifyTechnicalError(raw: string): ErrorKind {
  const t = raw.trim();
  if (!t) return null;
  if (/Export .+ doesn't exist/i.test(t) || /was not found in module/i.test(t)) return "missing_export";
  if (/Module not found/i.test(t)) return "module_not_found";
  if (/Failed to fetch|NetworkError|Load failed|network error/i.test(t)) return "network";
  if (/Failed to load chunk|Loading chunk .* failed/i.test(t)) return "chunk";
  if (t.includes(" is not defined") || /^Cannot read properties of/i.test(t) || /^(Type|Reference|Syntax)Error:/i.test(t)) {
    return t.includes(" is not defined") ? "not_defined" : "runtime";
  }
  if (isTechnicalMessage(t)) return "runtime";
  return null;
}

export function errorTitle(variant: ErrorFallbackVariant, raw?: string): string {
  const trimmed = raw?.trim();
  if (trimmed && !isTechnicalMessage(trimmed)) {
    return "Operazione non riuscita";
  }
  void variant;
  return "Qualcosa è andato storto";
}

export function friendlyDescription(variant: ErrorFallbackVariant, raw?: string): string {
  const trimmed = raw?.trim();
  if (trimmed && !isTechnicalMessage(trimmed)) return trimmed;

  switch (classifyTechnicalError(trimmed ?? "")) {
    case "missing_export":
    case "module_not_found":
    case "not_defined":
    case "runtime":
      if (variant === "global") {
        return "L'applicazione non si è avviata correttamente.\nRiprova tra qualche istante.";
      }
      return "Non siamo riusciti a caricare questa pagina.\nRiprova tra qualche istante.";
    case "network":
      return "La connessione si è interrotta.\nControlla la rete e riprova.";
    case "chunk":
      return "È disponibile una versione aggiornata.\nPremi Riprova per ricaricare.";
    default:
      if (variant === "gestionale") {
        return "Non siamo riusciti a caricare questa sezione.\nRiprova tra qualche istante.";
      }
      if (variant === "global") {
        return "L'applicazione non si è avviata correttamente.\nRiprova tra qualche istante.";
      }
      return "Si è verificato un problema temporaneo.\nRiprova tra qualche istante.";
  }
}

export function buildTechnicalDetail(raw?: string, digest?: string): string | undefined {
  const trimmed = raw?.trim();
  const parts: string[] = [];
  if (trimmed && isTechnicalMessage(trimmed)) parts.push(trimmed);
  if (digest?.trim()) parts.push(`Digest: ${digest.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
