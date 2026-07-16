import type { EntityDatasetRef } from "@/lib/entity-resolution/entity-resolver-registry";
import type { EntityCandidate, EntityType } from "@/lib/entity-resolution/entity-resolution-types";
import { addettoDisplayName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { modelliVisibiliPerMarcaHierarchy, marcheFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";

export type ResolutionDataSources = {
  settings: CabAppSettingsResolved;
  magazzino: readonly RicambioMagazzino[];
  mezzi: readonly MezzoGestito[];
};

export function candidatesFromStrings(labels: readonly string[]): EntityCandidate[] {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ id: null, label }));
}

export function poolForDataset(dataset: EntityDatasetRef, sources: ResolutionDataSources): EntityCandidate[] {
  const { settings, magazzino, mezzi } = sources;
  switch (dataset) {
    case "mezziListe.clienti":
      return candidatesFromStrings(settings.mezziListe.clienti);
    case "mezziListe.cantieri":
      return candidatesFromStrings(settings.mezziListe.cantieri);
    case "mezziListe.utilizzatori":
      return candidatesFromStrings(settings.mezziListe.utilizzatori);
    case "mezziListe.marche": {
      const flat = settings.mezziListe.marche ?? [];
      const hier = marcheFromHierarchyTree(settings.mezziListe, "attrezzature");
      return candidatesFromStrings([...new Set([...flat, ...hier])]);
    }
    case "mezziListe.modelli":
      return candidatesFromStrings(settings.mezziListe.modelli ?? []);
    case "mezziListe.tipiAttrezzatura":
      return candidatesFromStrings(settings.mezziListe.tipiAttrezzatura ?? []);
    case "mezziListe.tipiTelaio":
      return candidatesFromStrings(settings.mezziListe.tipiTelaio ?? []);
    case "mezziListe.attrezzature":
      return (settings.mezziListe.attrezzature ?? []).map((m) => ({ id: m.id, label: m.nome }));
    case "mezziListe.telai":
      return (settings.mezziListe.telai ?? []).map((m) => ({ id: m.id, label: m.nome }));
    case "magazzinoMaster.marche":
      return candidatesFromStrings(settings.magazzinoMaster.marche ?? []);
    case "magazzinoMaster.categorie":
      return candidatesFromStrings(settings.magazzinoMaster.categorie ?? []);
    case "magazzinoMaster.fornitori":
      return candidatesFromStrings(settings.magazzinoMaster.fornitori ?? []);
    case "lavorazioni.addettiRecords":
      return settings.lavorazioni.addettiRecords.map((r: AddettoRecord) => ({
        id: r.id,
        label: addettoDisplayName(r),
        meta: { nome: r.nome },
      }));
    case "magazzino.ricambi":
      return magazzino.flatMap((r) => {
        const codes = [
          r.codiceFornitoreOriginale,
          r.codiceFornitoreOriginaleSecondario,
          r.codiceFornitoreNonOriginale,
        ].filter(Boolean);
        return codes.map((code) => ({
          id: r.id,
          label: code,
          meta: { descrizione: r.descrizione, marca: r.marca },
        }));
      });
    case "mezzi.catalog":
      return mezzi.flatMap((m) => {
        const ids: EntityCandidate[] = [];
        if (m.targa?.trim()) ids.push({ id: m.id, label: m.targa.trim(), meta: { kind: "targa", cliente: m.cliente } });
        if (m.matricola?.trim())
          ids.push({ id: m.id, label: m.matricola.trim(), meta: { kind: "matricola", cliente: m.cliente } });
        if (m.vin?.trim()) ids.push({ id: m.id, label: m.vin.trim(), meta: { kind: "vin", cliente: m.cliente } });
        return ids;
      });
    default:
      return [];
  }
}

export function restrictedModelPool(marcaLabel: string, liste: MezziListePrefs): EntityCandidate[] {
  const fromHierarchy = modelliVisibiliPerMarcaHierarchy(liste, "attrezzature", marcaLabel);
  const flat = (liste.modelli ?? []).filter((m) =>
    fromHierarchy.length > 0 ? fromHierarchy.includes(m) : true,
  );
  const labels = fromHierarchy.length > 0 ? fromHierarchy : flat;
  return candidatesFromStrings(labels);
}

export function restrictedRicambioPool(
  magazzino: readonly RicambioMagazzino[],
  marcaLabel?: string | null,
  modelloLabel?: string | null,
): EntityCandidate[] {
  let items = [...magazzino];
  if (marcaLabel?.trim()) {
    const marca = marcaLabel.trim().toLowerCase();
    items = items.filter((r) => r.marca.trim().toLowerCase() === marca);
  }
  if (modelloLabel?.trim()) {
    const needle = modelloLabel.trim().toLowerCase();
    items = items.filter((r) =>
      (r.compatibilitaMezzi ?? []).some((c) => c.toLowerCase().includes(needle)),
    );
  }
  return items.flatMap((r) => {
    const code = r.codiceFornitoreOriginale.trim();
    if (!code) return [];
    return [{ id: r.id, label: code, meta: { descrizione: r.descrizione } }];
  });
}

export function entityTypeForFieldKey(fieldKey: string): EntityType | null {
  const k = fieldKey.trim().toLowerCase().replace(/^ingresso\./, "");
  if (k === "cliente") return "CLIENTE";
  if (k === "cantiere") return "CANTIERE";
  if (k === "utilizzatore") return "UTILIZZATORE";
  if (["marca_attrezzatura", "marcaattrezzatura", "attrezzatura_marca"].includes(k)) return "MARCA";
  if (["modello_attrezzatura", "modelloattrezzatura", "attrezzatura_modello"].includes(k)) return "MODELLO";
  if (["marca_telaio", "marcatelaio", "telaio_marca"].includes(k)) return "MARCA";
  if (["modello_telaio", "modellotelaio", "telaio_modello"].includes(k)) return "MODELLO";
  if (["tipo_attrezzatura", "tipoattrezzatura", "attrezzatura"].includes(k)) return "TIPO_ATTREZZATURA";
  if (["tipo_telaio", "tipotelaio"].includes(k)) return "TIPO_TELAIO";
  if (k === "addetto_accettazione" || k === "addettoaccettazione") return "OPERATORE";
  if (/^riga_\d+_codice$/.test(k)) return "RICAMBIO";
  if (/^riga_\d+_nome$/.test(k)) return "OPERATORE";
  if (["targa", "matricola", "vin", "n_scuderia", "nscuderia", "numero_scuderia"].includes(k)) return "MEZZO_IDENT";
  return null;
}
