import { clampTextOrNull, clampTextTrimmed, TEXT_LONG, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import {
  logAttrezzatureLegacyWriteAttempt,
} from "@/lib/observability/attrezzature-v2-telemetry";
import type { MezzoRow } from "@/src/types/supabase-tables";

type MezzoWrite = Partial<Omit<MezzoRow, "id" | "created_at" | "updated_at">>;

const LEGACY_ATTREZZATURA_KEYS = ["marca", "modello", "matricola", "tipo_attrezzatura"] as const;

function clampMetaNote(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (meta == null) return meta;
  if (typeof meta.note !== "string") return meta;
  const note = clampTextOrNull(meta.note, TEXT_LONG);
  return { ...meta, ...(note != null ? { note } : { note: "" }) };
}

function hasLegacyAttrezzaturaValue(data: MezzoWrite): string[] {
  const touched: string[] = [];
  for (const key of LEGACY_ATTREZZATURA_KEYS) {
    const v = data[key];
    if (v == null) continue;
    const t = String(v).trim();
    if (!t || t === "—" || t.toLowerCase() === "non assegnata") continue;
    touched.push(key);
  }
  return touched;
}

/** Normalizza campi testo mezzo prima di insert/update (V2: strip colonne attrezzatura legacy). */
export function sanitizeMezzoWritePayload<T extends MezzoWrite>(
  data: T,
  opts?: { v2Enabled?: boolean; source?: string },
): T {
  const out = { ...data } as T & MezzoWrite;
  const touched = hasLegacyAttrezzaturaValue(out);
  if (touched.length > 0) {
    logAttrezzatureLegacyWriteAttempt({ source: opts?.source ?? "sanitizeMezzoWritePayload", fields: touched });
  }
  for (const key of LEGACY_ATTREZZATURA_KEYS) {
    delete out[key];
  }
  if (typeof out.cliente === "string") out.cliente = clampTextTrimmed(out.cliente, TEXT_SHORT);
  if (typeof out.marca === "string") out.marca = clampTextTrimmed(out.marca, TEXT_SHORT);
  if (typeof out.modello === "string") out.modello = clampTextTrimmed(out.modello, TEXT_SHORT);
  if (typeof out.utilizzatore === "string") out.utilizzatore = clampTextOrNull(out.utilizzatore, TEXT_SHORT);
  if (typeof out.targa === "string") out.targa = clampTextOrNull(out.targa, TEXT_SHORT);
  if (typeof out.matricola === "string") out.matricola = clampTextOrNull(out.matricola, TEXT_SHORT);
  if (typeof out.tipo_attrezzatura === "string") {
    out.tipo_attrezzatura = clampTextOrNull(out.tipo_attrezzatura, TEXT_SHORT);
  }
  if (typeof out.tipo_telaio === "string") out.tipo_telaio = clampTextOrNull(out.tipo_telaio, TEXT_SHORT);
  if (typeof out.marca_telaio === "string") out.marca_telaio = clampTextOrNull(out.marca_telaio, TEXT_SHORT);
  if (typeof out.modello_telaio === "string") out.modello_telaio = clampTextOrNull(out.modello_telaio, TEXT_SHORT);
  if (typeof out.telaio_num === "string") out.telaio_num = clampTextOrNull(out.telaio_num, TEXT_SHORT);
  if (out.meta != null && typeof out.meta === "object") {
    out.meta = clampMetaNote(out.meta as Record<string, unknown>) as MezzoRow["meta"];
  }
  return out;
}
