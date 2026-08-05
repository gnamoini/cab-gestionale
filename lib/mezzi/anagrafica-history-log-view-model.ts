import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { MEZZO_PERMANENT_FIELD_LABELS } from "@/lib/domain/mezzo/build-scheda-save-conflict-summary";
import {
  buildModificaRigaFromChanges,
  type GestionaleLogViewModel,
} from "@/lib/gestionale-log/view-model";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";

/** Timeline hub: storico anagrafica campo-per-campo → stesso shell del log gestionale. */
export function buildAnagraficaHistoryGestionaleLogViewModel(
  row: MezzoAnagraficaHistoryRow,
): GestionaleLogViewModel {
  const fields = row.changed_fields as MezzoPermanentFieldKey[];
  const changes = fields.map((key) => ({
    campo: MEZZO_PERMANENT_FIELD_LABELS[key] ?? key,
    prima: row.old_values[key] ?? "—",
    dopo: row.new_values[key] ?? "—",
  }));
  const origine = row.origine.replace(/_/g, " ").trim() || "anagrafica";
  const autore = row.profiles
    ? profileDisplayName({ nome: row.profiles.nome ?? "", cognome: row.profiles.cognome }) || "Utente"
    : row.user_id
      ? "Utente"
      : "Sistema";
  return {
    tone: "update",
    tipoRiga: "AGGIORNAMENTO ANAGRAFICA",
    oggettoRiga: origine.charAt(0).toUpperCase() + origine.slice(1),
    modificaRiga: buildModificaRigaFromChanges(changes),
    autore,
    atIso: row.created_at,
  };
}
