import { clampTextOrNull, clampTextTrimmed, TEXT_LONG, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import type { MezzoRow } from "@/src/types/supabase-tables";

type MezzoWrite = Partial<Omit<MezzoRow, "id" | "created_at" | "updated_at">>;

function clampMetaNote(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (meta == null) return meta;
  if (typeof meta.note !== "string") return meta;
  const note = clampTextOrNull(meta.note, TEXT_LONG);
  return { ...meta, ...(note != null ? { note } : { note: "" }) };
}

/** Normalizza campi testo mezzo prima di insert/update. */
export function sanitizeMezzoWritePayload<T extends MezzoWrite>(data: T): T {
  const out = { ...data } as T & MezzoWrite;
  if (typeof out.cliente === "string") out.cliente = clampTextTrimmed(out.cliente, TEXT_SHORT);
  if (typeof out.marca === "string") out.marca = clampTextTrimmed(out.marca, TEXT_SHORT);
  if (typeof out.modello === "string") out.modello = clampTextTrimmed(out.modello, TEXT_SHORT);
  if (typeof out.utilizzatore === "string") out.utilizzatore = clampTextOrNull(out.utilizzatore, TEXT_SHORT);
  if (typeof out.targa === "string") out.targa = clampTextOrNull(out.targa, TEXT_SHORT);
  if (typeof out.matricola === "string") out.matricola = clampTextOrNull(out.matricola, TEXT_SHORT);
  if (out.meta != null && typeof out.meta === "object") {
    out.meta = clampMetaNote(out.meta as Record<string, unknown>) as MezzoRow["meta"];
  }
  return out;
}
