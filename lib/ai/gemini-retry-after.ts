/** Secondi da attendere — messaggi SDK Gemini / Google AI ("Please retry in 32.09s"). */
export function parseGeminiRetryAfterSec(message: string): number | null {
  const trimmed = message.trim();
  if (!trimmed) return null;
  const direct = trimmed.match(/retry\s+in\s+([\d.]+)\s*s(?:ec(?:ond(?:i)?)?)?/i);
  if (direct) return ceilPositiveSeconds(direct[1]);
  const star = trimmed.match(/\*\s*Please retry in\s+([\d.]+)\s*s/i);
  if (star) return ceilPositiveSeconds(star[1]);
  return null;
}

function ceilPositiveSeconds(raw: string): number | null {
  const n = Math.ceil(Number.parseFloat(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 86_400);
}

export function isGeminiQuotaErrorMessage(message: string): boolean {
  const upper = message.toUpperCase();
  return (
    upper.includes("QUOTA") ||
    upper.includes("RATE LIMIT") ||
    upper.includes("429") ||
    upper.includes("RESOURCE_EXHAUSTED") ||
    upper.includes("TOO MANY REQUESTS")
  );
}

export function isGeminiModelUnavailableMessage(message: string): boolean {
  return /no longer available/i.test(message) || /models\/gemini-/i.test(message);
}

/** Utilizzo quota / token API Gemini (AI Studio). */
export const GEMINI_API_USAGE_URL = "https://aistudio.google.com/usage";

/** Messaggio breve per UI — il countdown è separato. */
export function formatCaptureAnalyzeErrorMessage(message: string): string {
  if (isGeminiQuotaErrorMessage(message)) {
    return "Limite richieste o quota Gemini raggiunta.";
  }
  if (isGeminiModelUnavailableMessage(message)) {
    return "Modello Gemini non disponibile per questa chiave API. Il gestionale usa gemini-3.5-flash — riprova dopo il deploy o contatta l'amministratore.";
  }
  if (/troppe analisi/i.test(message)) {
    return "Troppe analisi in poco tempo.";
  }
  const last = message.match(/Last error:\s*([\s\S]+?)(?:\.\s*\*|\s*Please retry|\s*$)/i);
  if (last?.[1]?.trim()) {
    const core = last[1].trim();
    if (isGeminiQuotaErrorMessage(core)) {
      return "Limite richieste o quota Gemini raggiunta.";
    }
    return core.length > 240 ? `${core.slice(0, 237)}…` : core;
  }
  return message.length > 280 ? `${message.slice(0, 277)}…` : message;
}

export function formatRetryCountdownLabel(remainingSec: number): string {
  const total = Math.max(0, Math.ceil(remainingSec));
  if (total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  if (total >= 60) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${total} s`;
}
