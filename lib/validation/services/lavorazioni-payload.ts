import {
  validateLavorazioneTargetForInsert,
  type InterventoTargetType,
} from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import { assertValidPriorita } from "@/lib/lavorazioni/priorita-order";
import { TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";

export const LAVORAZIONE_WRITABLE_KEYS = [
  "mezzo_id",
  "stato",
  "priorita",
  "data_ingresso",
  "data_uscita",
  "note",
  "target_type",
  "attrezzatura_id",
  "is_tagliando",
  "maintenance_execution_kind",
  "repair_present",
  "tagliando_preset_ref",
  "tagliando_preset_version_ref",
  "tagliando_assign_preset_to_mezzo",
  "tagliando_no_preset_reason",
] as const;

export type LavorazioneWritableKey = (typeof LAVORAZIONE_WRITABLE_KEYS)[number];

export type LavorazioneWritePayload = {
  mezzo_id?: string;
  stato?: StatoLavorazione;
  priorita?: PrioritaLavorazione;
  data_ingresso?: string | null;
  data_uscita?: string | null;
  note?: string | null;
  target_type?: InterventoTargetType;
  attrezzatura_id?: string | null;
  is_tagliando?: boolean;
  maintenance_execution_kind?: "scheduled" | "extraordinary" | null;
  repair_present?: boolean;
  tagliando_preset_ref?: string | null;
  tagliando_preset_version_ref?: string | null;
  tagliando_assign_preset_to_mezzo?: boolean | null;
  tagliando_no_preset_reason?: string | null;
};

export type LavorazioneCreatePayload = LavorazioneWritePayload & {
  mezzo_id: string;
  stato: StatoLavorazione;
  priorita: PrioritaLavorazione;
  target_type: InterventoTargetType;
  attrezzatura_id: string | null;
};

export function normalizeLavorazioneNote(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length <= TEXT_LONG ? t : t.slice(0, TEXT_LONG);
}

export function pickLavorazioneWritePayload(data: Record<string, unknown>): LavorazioneWritePayload {
  const out: LavorazioneWritePayload = {};
  for (const key of LAVORAZIONE_WRITABLE_KEYS) {
    if (!(key in data) || data[key] === undefined) continue;
    if (key === "mezzo_id" && typeof data.mezzo_id === "string") {
      out.mezzo_id = data.mezzo_id.trim();
    } else if (key === "stato" && typeof data.stato === "string") {
      out.stato = data.stato as StatoLavorazione;
    } else if (key === "priorita" && typeof data.priorita === "string") {
      out.priorita = data.priorita as PrioritaLavorazione;
    } else if (key === "data_ingresso") {
      out.data_ingresso =
        data.data_ingresso === null || data.data_ingresso === undefined
          ? null
          : String(data.data_ingresso).trim() || null;
    } else if (key === "data_uscita") {
      out.data_uscita =
        data.data_uscita === null || data.data_uscita === undefined
          ? null
          : String(data.data_uscita).trim() || null;
    } else if (key === "note") {
      out.note = normalizeLavorazioneNote(
        data.note === null || data.note === undefined ? null : String(data.note),
      );
    } else if (key === "target_type") {
      const t = data.target_type;
      if (t === "telaio" || t === "attrezzatura") out.target_type = t;
    } else if (key === "attrezzatura_id") {
      out.attrezzatura_id =
        data.attrezzatura_id === null || data.attrezzatura_id === undefined
          ? null
          : String(data.attrezzatura_id).trim() || null;
    } else if (key === "is_tagliando") {
      out.is_tagliando = Boolean(data.is_tagliando);
    } else if (key === "maintenance_execution_kind") {
      const k = data.maintenance_execution_kind;
      out.maintenance_execution_kind =
        k === "scheduled" || k === "extraordinary" ? k : k === null || k === undefined ? null : undefined;
    } else if (key === "repair_present") {
      out.repair_present = Boolean(data.repair_present);
    } else if (key === "tagliando_preset_ref") {
      out.tagliando_preset_ref =
        data.tagliando_preset_ref === null || data.tagliando_preset_ref === undefined
          ? null
          : String(data.tagliando_preset_ref).trim() || null;
    } else if (key === "tagliando_preset_version_ref") {
      out.tagliando_preset_version_ref =
        data.tagliando_preset_version_ref === null || data.tagliando_preset_version_ref === undefined
          ? null
          : String(data.tagliando_preset_version_ref).trim() || null;
    } else if (key === "tagliando_assign_preset_to_mezzo") {
      out.tagliando_assign_preset_to_mezzo =
        data.tagliando_assign_preset_to_mezzo === null || data.tagliando_assign_preset_to_mezzo === undefined
          ? null
          : Boolean(data.tagliando_assign_preset_to_mezzo);
    } else if (key === "tagliando_no_preset_reason") {
      out.tagliando_no_preset_reason =
        data.tagliando_no_preset_reason === null || data.tagliando_no_preset_reason === undefined
          ? null
          : String(data.tagliando_no_preset_reason).trim() || null;
    }
  }
  return out;
}

/** Payload INSERT lavorazione con target validato (speculare al CHECK DB). */
export function pickLavorazioneCreatePayload(data: Record<string, unknown>): LavorazioneCreatePayload {
  const picked = pickLavorazioneWritePayload(data);
  const mezzoId = picked.mezzo_id?.trim();
  if (!mezzoId) {
    throw new Error("mezzo_id obbligatorio per la creazione lavorazione.");
  }
  if (!picked.stato) {
    throw new Error("stato obbligatorio per la creazione lavorazione.");
  }
  if (!picked.priorita) {
    throw new Error("priorita obbligatoria per la creazione lavorazione.");
  }

  const target = validateLavorazioneTargetForInsert(
    picked.target_type ?? data.target_type,
    picked.attrezzatura_id !== undefined ? picked.attrezzatura_id : data.attrezzatura_id,
  );

  return {
    ...picked,
    mezzo_id: mezzoId,
    stato: picked.stato,
    priorita: assertValidPriorita(picked.priorita),
    target_type: target.target_type,
    attrezzatura_id: target.attrezzatura_id,
  };
}
