/** Messaggi operatore per errori apply/resume — no jargon tecnico. */
export function mapCaptureApplyErrorMessage(
  message: string,
  code?: string | null,
): string {
  if (message === "REVIEW_REQUIRED") return "";
  if (code === "PLAN_STALE") {
    return "I dati sono cambiati: verifica i campi e conferma di nuovo l'import.";
  }
  if (code === "APPLY_IN_PROGRESS") {
    return "Import già in corso. Attendi qualche secondo e riprova.";
  }
  if (code === "RICAMBIO_NOT_FOUND" || message.includes("Ricambi non trovati")) {
    return "Alcuni ricambi non sono in magazzino. Correggi le righe o rimuovile prima di importare.";
  }
  if (
    message.includes("Resume") ||
    message.includes("apply_partial") ||
    message.includes("non completato")
  ) {
    return "Import non completato. Puoi riprendere l'operazione.";
  }
  if (message.includes("Validazione bloccata") || code === "VALIDATION_BLOCKED") {
    return "Import bloccato: correggi gli errori evidenziati nel form.";
  }
  return message;
}
