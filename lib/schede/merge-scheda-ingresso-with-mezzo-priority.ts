import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import {
  isLavorazioneOnlyField,
  MEZZO_PERMANENT_FIELDS,
  type MezzoPermanentFieldKey,
} from "@/lib/schede/scheda-ingresso-field-roles";
import {
  copySchedaIngressoFieldFromClient,
  isSchedaIngressoFieldEmpty,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

const NEVER_COPY = new Set<keyof SchedaIngressoFields>([
  "dataIngresso",
  "richiedenteFirma",
  "addettoFirma",
]);

function mezzoFieldEmpty(mezzo: MezzoGestito | null | undefined, key: MezzoPermanentFieldKey): boolean {
  if (!mezzo) return true;
  const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
  return isSchedaIngressoFieldEmpty(key, fromMezzo[key]);
}

/**
 * Merge con priorità:
 * 1. Valore già nel form (non vuoto)
 * 2. mezzo.anagrafica (se linkato)
 * 3. scheda sorgente — solo se mezzo assente o campo mezzo vuoto
 */
export function mergeSchedaIngressoWithMezzoPriority(
  current: SchedaIngressoFields,
  options: {
    fromScheda?: SchedaIngressoFields | null;
    linkedMezzo?: MezzoGestito | null;
    copySignatures?: boolean;
  },
): SchedaIngressoFields {
  const { fromScheda, linkedMezzo, copySignatures } = options;
  const fromMezzo = linkedMezzo ? buildSchedaIngressoFieldsFromMezzo(linkedMezzo) : null;

  const skipKeys = new Set(NEVER_COPY);
  if (copySignatures) {
    skipKeys.delete("richiedenteFirma");
    skipKeys.delete("addettoFirma");
  }

  const next = { ...current };

  for (const key of Object.keys(current) as (keyof SchedaIngressoFields)[]) {
    if (skipKeys.has(key) || isLavorazioneOnlyField(key)) continue;
    if (!isSchedaIngressoFieldEmpty(key, next[key])) continue;

    if (fromMezzo && !isSchedaIngressoFieldEmpty(key, fromMezzo[key])) {
      copySchedaIngressoFieldFromClient(next, fromMezzo, key);
      continue;
    }

    if (!fromScheda) continue;
    if (linkedMezzo && !mezzoFieldEmpty(linkedMezzo, key as MezzoPermanentFieldKey)) {
      continue;
    }
    if (!isSchedaIngressoFieldEmpty(key, fromScheda[key])) {
      copySchedaIngressoFieldFromClient(next, fromScheda, key);
    }
  }

  return next;
}

/** Copia solo campi permanenti da scheda (es. full-snapshot hub → permanent-only). */
export function copyPermanentFieldsFromScheda(
  current: SchedaIngressoFields,
  fromScheda: SchedaIngressoFields,
  linkedMezzo?: MezzoGestito | null,
): SchedaIngressoFields {
  return mergeSchedaIngressoWithMezzoPriority(current, { fromScheda, linkedMezzo });
}

export function permanentFieldsDiffer(
  a: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
  b: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
): MezzoPermanentFieldKey[] {
  const changed: MezzoPermanentFieldKey[] = [];
  for (const key of MEZZO_PERMANENT_FIELDS) {
    if (String(a[key] ?? "").trim() !== String(b[key] ?? "").trim()) {
      changed.push(key);
    }
  }
  return changed;
}
