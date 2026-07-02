import type { MezzoFormState } from "@/components/gestionale/mezzi/mezzi-form-fields";
import { formToMezzoInsert } from "@/components/gestionale/mezzi/mezzi-form-fields";
import { attrezzatureService } from "@/src/services/attrezzature.service";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

function formToMezzoTelaioPayload(f: MezzoFormState): MezzoInsert {
  const base = formToMezzoInsert(f);
  return {
    ...base,
    marca: "—",
    modello: "—",
    matricola: null,
    tipo_attrezzatura: null,
  };
}

function attrezzaturaPatchFromForm(f: MezzoFormState) {
  const annoParsed = parseInt(f.anno, 10);
  const anno = Math.max(1980, Math.min(2035, Number.isFinite(annoParsed) ? annoParsed : new Date().getFullYear()));
  return {
    marca: f.marca.trim(),
    modello: f.modello.trim() || "—",
    matricola: f.matricola.trim() || null,
    tipo_attrezzatura: f.tipoAttrezzatura.trim() || null,
    portata: null,
    note: null,
    anno,
  };
}

/** Hub mezzi V2: mezzo = telaio; attrezzatura su tabella dedicata. */
export async function persistMezzoFormCreate(input: {
  form: MezzoFormState;
  createMezzo: (data: MezzoInsert) => Promise<MezzoRow>;
}): Promise<MezzoRow> {
  const row = await input.createMezzo(formToMezzoTelaioPayload(input.form));
  const att = attrezzaturaPatchFromForm(input.form);
  const res = await attrezzatureService.create({ mezzo_id: row.id, ...att });
  if (!res.success) throw new Error(res.error ?? "Errore creazione attrezzatura.");
  return row;
}

export async function persistMezzoFormUpdate(input: {
  mezzoId: string;
  attrezzaturaId?: string | null;
  form: MezzoFormState;
  updateMezzo: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
}): Promise<MezzoRow> {
  const row = await input.updateMezzo(input.mezzoId, formToMezzoTelaioPayload(input.form));
  const att = attrezzaturaPatchFromForm(input.form);
  if (input.attrezzaturaId) {
    const res = await attrezzatureService.update(input.attrezzaturaId, att);
    if (!res.success) throw new Error(res.error ?? "Errore aggiornamento attrezzatura.");
  } else {
    const res = await attrezzatureService.create({ mezzo_id: input.mezzoId, ...att });
    if (!res.success) throw new Error(res.error ?? "Errore creazione attrezzatura.");
  }
  return row;
}
