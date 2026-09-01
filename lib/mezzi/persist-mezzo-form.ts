import { formToMezzoInsert, type MezzoFormState } from "@/components/gestionale/mezzi/mezzi-form-fields";
import { buildBrowserAttrezzaturaResolveDeps } from "@/lib/domain/mezzo-attrezzatura/build-browser-attrezzatura-resolve-deps";
import { pickPrimaryAttrezzatura } from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import { resolveOrCreateAttrezzatura } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { AttrezzaturaMergeField } from "@/lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch";
import { buildBrowserMezzoResolveDeps } from "@/lib/domain/mezzo/build-browser-mezzo-resolve-deps";
import { resolveOrCreateMezzo } from "@/lib/domain/mezzo/resolve-or-create-mezzo";
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

function formToMezzoUpdateWithoutAssociation(f: MezzoFormState): MezzoUpdate {
  const full = formToMezzoTelaioPayload(f);
  const { meta, ...rest } = full;
  const metaObj =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};
  delete metaObj.cantiere;
  return {
    ...rest,
    ...(Object.keys(metaObj).length > 0 ? { meta: metaObj } : {}),
  };
}

function attrezzaturaPatchFromForm(f: MezzoFormState, mezzoId: string) {
  const annoParsed = parseInt(f.anno, 10);
  const anno = Math.max(1980, Math.min(2035, Number.isFinite(annoParsed) ? annoParsed : new Date().getFullYear()));
  return {
    mezzo_id: mezzoId,
    marca: f.marca.trim(),
    modello: f.modello.trim() || "—",
    matricola: f.matricola.trim() || null,
    tipo_attrezzatura: f.tipoAttrezzatura.trim() || null,
    portata: null,
    note: null,
    anno,
  };
}

const CATALOG_ATTREZZATURA_OVERWRITE = new Set<AttrezzaturaMergeField>([
  "marca",
  "modello",
  "tipo_attrezzatura",
  "matricola",
]);

/** Hub mezzi V2: mezzo = telaio; attrezzatura su tabella dedicata. */
export async function persistMezzoFormCreate(input: {
  form: MezzoFormState;
}): Promise<MezzoRow> {
  const mezzoDeps = await buildBrowserMezzoResolveDeps();
  const resolvedMezzo = await resolveOrCreateMezzo(
    { incoming: formToMezzoTelaioPayload(input.form), catalog: [] },
    mezzoDeps,
  );
  const row = resolvedMezzo.row;
  const deps = await buildBrowserAttrezzaturaResolveDeps();
  const att = attrezzaturaPatchFromForm(input.form, row.id);
  const resolvedAtt = await resolveOrCreateAttrezzatura(
    { mezzoId: row.id, incoming: att, hintId: null },
    deps,
  );
  if (!resolvedAtt.row) throw new Error("Errore creazione attrezzatura.");
  return row;
}

export async function persistMezzoFormUpdate(input: {
  mezzoId: string;
  attrezzaturaId?: string | null;
  form: MezzoFormState;
  updateMezzo: (id: string, data: MezzoUpdate) => Promise<MezzoRow>;
}): Promise<MezzoRow> {
  const payload = formToMezzoUpdateWithoutAssociation(input.form);
  const row = await input.updateMezzo(input.mezzoId, payload);
  const deps = await buildBrowserAttrezzaturaResolveDeps();
  const att = attrezzaturaPatchFromForm(input.form, input.mezzoId);
  let hintId = input.attrezzaturaId?.trim() || null;
  if (!hintId) {
    const rows = await deps.listByMezzo(input.mezzoId);
    hintId = pickPrimaryAttrezzatura(rows, input.mezzoId)?.id ?? null;
  }
  await resolveOrCreateAttrezzatura(
    {
      mezzoId: input.mezzoId,
      incoming: att,
      hintId,
      mergeMode: "user_confirmed_overwrite",
      overwriteFields: CATALOG_ATTREZZATURA_OVERWRITE,
    },
    deps,
  );
  return row;
}
