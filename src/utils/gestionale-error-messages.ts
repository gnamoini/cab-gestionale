import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";

export type GestionaleErrorContext = {
  entity?: "mezzo" | "lavorazione" | "preventivo" | "documento" | "magazzino" | "report";
  action?: "delete" | "update" | "create" | "read";
};

const PERMISSION_PATTERN =
  /\b(401|403)\b|permesso|negato|\brls\b|unauthor|forbidden|jwt|sessione|non autenticat|not authorized|policy|insufficient|42501/i;

const FK_PATTERN = /23503|foreign key|violates foreign key|referential integrity/i;
const NOT_FOUND_PATTERN = /PGRST116|not found|no rows|0 rows/i;
const UNIQUE_PATTERN = /23505|duplicate key|unique constraint|already exists/i;

function looksItalianReadable(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (/^[A-Z_]+:/.test(t)) return false;
  if (FK_PATTERN.test(t) || UNIQUE_PATTERN.test(t) || NOT_FOUND_PATTERN.test(t)) return false;
  return /[àèéìòù]|impossibile|non è|non pu|errore|operazione|collegat|elimin|salvat|permess/i.test(t);
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

export function humanizeGestionaleError(raw: string, ctx?: GestionaleErrorContext): string {
  const message = raw.trim();
  if (!message) return "Operazione non riuscita. Riprova o contatta l'amministratore.";

  if (PERMISSION_PATTERN.test(message)) return RBAC_DENIED_MESSAGE;
  if (NOT_FOUND_PATTERN.test(message)) return "Elemento non trovato o già eliminato.";
  if (UNIQUE_PATTERN.test(message)) return "Esiste già un record con gli stessi dati.";
  if (FK_PATTERN.test(message)) {
    if (ctx?.action === "delete") return fkDeleteMessage(message, ctx);
    return "Operazione non consentita: esistono dati collegati che impediscono la modifica.";
  }

  if (looksItalianReadable(message)) return message;
  return "Operazione non riuscita. Riprova o contatta l'amministratore.";
}
