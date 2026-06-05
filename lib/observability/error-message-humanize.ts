export type ErrorFallbackVariant = "root" | "gestionale" | "global";

export function isTechnicalMessage(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (t.includes(" is not defined")) return true;
  if (t.startsWith("Cannot ") || t.startsWith("Failed to ")) return true;
  if (/^(Type|Reference|Syntax)Error:/i.test(t)) return true;
  return t.length > 120;
}

export function friendlyDescription(variant: ErrorFallbackVariant, raw?: string): string {
  const trimmed = raw?.trim();
  if (trimmed && !isTechnicalMessage(trimmed)) return trimmed;
  if (variant === "gestionale") {
    return "Si è verificato un problema temporaneo. Riprova o torna al menu.";
  }
  if (variant === "global") {
    return "L'applicazione non è riuscita ad avviarsi. Riprova o torna alla home.";
  }
  return "Si è verificato un problema temporaneo. Riprova tra qualche istante.";
}

export function buildTechnicalDetail(raw?: string, digest?: string): string | undefined {
  const trimmed = raw?.trim();
  const parts: string[] = [];
  if (trimmed && isTechnicalMessage(trimmed)) parts.push(trimmed);
  if (digest?.trim()) parts.push(`Digest: ${digest.trim()}`);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
