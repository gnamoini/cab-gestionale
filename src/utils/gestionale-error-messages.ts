import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { gestionaleModuleLabel } from "@/src/lib/ux/gestionale-module-labels";

export type GestionaleErrorContext = {
  entity?: "mezzo" | "lavorazione" | "preventivo" | "fattura" | "documento" | "magazzino" | "report";
  module?: GestionalePermissionModule;
  action?: "delete" | "update" | "create" | "read";
};

export const GESTIONALE_PERMISSION_DENIED =
  "Non hai i permessi per eseguire questa azione.";

export const GESTIONALE_RESERVED_ACTION =
  "Questa operazione è riservata agli utenti autorizzati.";

const PERMISSION_PATTERN =
  /\b(401|403)\b|permesso|negat|\brls\b|row-level|unauthor|forbidden|jwt|sessione|non autenticat|not authorized|policy|insufficient|42501|PGRST301|permission denied|new row violates|violates row-level/i;

const NETWORK_PATTERN = /failed to fetch|networkerror|network error|load failed|econnreset|etimedout/i;

const FK_PATTERN = /23503|foreign key|violates foreign key|referential integrity/i;
const NOT_FOUND_PATTERN = /PGRST116|not found|no rows|0 rows/i;
const UNIQUE_PATTERN = /23505|duplicate key|unique constraint|already exists/i;

const TECHNICAL_PATTERN =
  /postgrest|postgres|sqlstate|syntax error|stack trace|at \w+\(|\.ts:\d+|PGRST\d{3}|JWT expired|invalid input syntax/i;

function looksItalianReadable(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (/^[A-Z_]+:/.test(t)) return false;
  if (FK_PATTERN.test(t) || UNIQUE_PATTERN.test(t) || NOT_FOUND_PATTERN.test(t)) return false;
  if (TECHNICAL_PATTERN.test(t)) return false;
  return /[àèéìòù]|impossibile|non è|non pu|errore|operazione|collegat|elimin|salvat|permess/i.test(t);
}

function sectionDeniedMessage(ctx?: GestionaleErrorContext): string | null {
  if (ctx?.module) {
    return `Accesso negato alla sezione ${gestionaleModuleLabel(ctx.module)}.`;
  }
  if (ctx?.entity === "magazzino") return "Accesso negato alla sezione Magazzino.";
  if (ctx?.entity === "lavorazione") return "Accesso negato alla sezione Lavorazioni.";
  if (ctx?.entity === "mezzo") return "Accesso negato alla sezione Mezzi.";
  if (ctx?.entity === "documento") return "Accesso negato alla sezione Documenti.";
  if (ctx?.entity === "preventivo") return "Accesso negato alla sezione Preventivi.";
  if (ctx?.entity === "fattura") return "Accesso negato alla sezione Fatturazione.";
  if (ctx?.entity === "report") return "Accesso negato alla sezione Report.";
  return null;
}

function fkDeleteMessage(raw: string, ctx?: GestionaleErrorContext): string {
  if (ctx?.entity === "mezzo") {
    if (/elimina le lavorazioni collegate|concludere o archiviare non basta/i.test(raw)) {
      return "Impossibile eliminare il mezzo: elimina le lavorazioni collegate (concludere o archiviare non basta).";
    }
    if (/lavorazione in corso|lavorazioni collegate/i.test(raw)) {
      return "Impossibile eliminare il mezzo: elimina le lavorazioni collegate (concludere o archiviare non basta).";
    }
    return "Impossibile eliminare il mezzo perché è ancora collegato a lavorazioni o preventivi.";
  }
  return "Impossibile eliminare: l'elemento è ancora collegato ad altri dati.";
}

export function isGestionalePermissionError(message: string): boolean {
  return PERMISSION_PATTERN.test(message);
}

export function humanizeGestionaleError(raw: string, ctx?: GestionaleErrorContext): string {
  const message = raw.trim();
  if (!message) return "Operazione non riuscita. Riprova tra poco.";

  if (NETWORK_PATTERN.test(message)) {
    return "Connessione non disponibile. Riprova tra poco.";
  }

  if (PERMISSION_PATTERN.test(message)) {
    if (ctx?.action === "read") {
      const section = sectionDeniedMessage(ctx);
      if (section) return section;
    }
    const section = sectionDeniedMessage(ctx);
    if (section && ctx?.action !== "delete") return section;
    if (ctx?.action === "delete" || ctx?.action === "update" || ctx?.action === "create") {
      return GESTIONALE_RESERVED_ACTION;
    }
    return GESTIONALE_PERMISSION_DENIED;
  }

  if (NOT_FOUND_PATTERN.test(message)) return "Elemento non trovato o già eliminato.";
  if (UNIQUE_PATTERN.test(message)) return "Esiste già un record con gli stessi dati.";
  if (FK_PATTERN.test(message)) {
    if (ctx?.action === "delete") return fkDeleteMessage(message, ctx);
    return "Operazione non consentita: esistono dati collegati che impediscono la modifica.";
  }

  if (TECHNICAL_PATTERN.test(message)) {
    return "Operazione non riuscita. Riprova tra poco.";
  }

  if (looksItalianReadable(message)) return message;
  return "Operazione non riuscita. Riprova tra poco.";
}
