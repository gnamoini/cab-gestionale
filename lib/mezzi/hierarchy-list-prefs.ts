import {
  aggiungiMarca as aggiungiMarcaAttrezzatura,
  aggiungiModello as aggiungiModelloAttrezzatura,
  compatLabelMarcaModello,
  eliminaMarca as eliminaMarcaAttrezzatura,
  eliminaModello as eliminaModelloAttrezzatura,
  migrateMezziListePrefs,
  rinominaMarca as rinominaMarcaAttrezzatura,
  rinominaModello as rinominaModelloAttrezzatura,
} from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";

export type HierarchyTreeKey = "attrezzature" | "telai";

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getHierarchyTree(liste: MezziListePrefs, key: HierarchyTreeKey): AttrezzaturaMarca[] {
  const p = migrateMezziListePrefs(liste);
  if (key === "attrezzature") return p.attrezzature ?? [];
  return p.telai ?? [];
}

function setHierarchyTree(liste: MezziListePrefs, key: HierarchyTreeKey, tree: AttrezzaturaMarca[]): MezziListePrefs {
  if (key === "attrezzature") {
    return migrateMezziListePrefs({ ...liste, attrezzature: tree });
  }
  return { ...liste, telai: tree };
}

export function marcheFromHierarchyTree(liste: MezziListePrefs, key: HierarchyTreeKey): string[] {
  return [...new Set(getHierarchyTree(liste, key).map((m) => m.nome.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "it"),
  );
}

export function modelliVisibiliPerMarcaHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  marcaNome: string,
): string[] {
  const hit = getHierarchyTree(liste, key).find((m) => m.nome.trim().toLowerCase() === marcaNome.trim().toLowerCase());
  if (!hit) return [];
  return [...new Set(hit.modelli.map((x) => x.nome.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
}

/** Etichette «Marca — Modello» per albero attrezzature o telai (app_settings.mezziListe). */
export function flattenCompatFromHierarchyTree(liste: MezziListePrefs, key: HierarchyTreeKey): string[] {
  const p = migrateMezziListePrefs(liste);
  const out: string[] = [];
  for (const m of getHierarchyTree(p, key)) {
    for (const mod of m.modelli) {
      const line = compatLabelMarcaModello(m.nome, mod.nome);
      if (line.trim()) out.push(line);
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b, "it"));
}

/** Filtra etichette compat per marche selezionate; array vuoto = tutte le combinazioni del tree. */
export function compatLabelsPerMarcheHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  marcheSelezionate: readonly string[],
): string[] {
  const marche = [...new Set(marcheSelezionate.map((m) => m.trim()).filter(Boolean))];
  if (marche.length === 0) return flattenCompatFromHierarchyTree(liste, key);
  const p = migrateMezziListePrefs(liste);
  const marcheSet = new Set(marche);
  const out: string[] = [];
  for (const m of getHierarchyTree(p, key)) {
    if (!marcheSet.has(m.nome.trim())) continue;
    for (const mod of m.modelli) {
      const line = compatLabelMarcaModello(m.nome, mod.nome);
      if (line.trim()) out.push(line);
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b, "it"));
}

export function aggiungiMarcaHierarchy(liste: MezziListePrefs, key: HierarchyTreeKey, nome: string): MezziListePrefs {
  if (key === "attrezzature") return aggiungiMarcaAttrezzatura(liste, nome);
  const t = nome.trim();
  if (!t) return liste;
  const tree = getHierarchyTree(liste, key);
  if (tree.some((m) => m.nome.trim().toLowerCase() === t.toLowerCase())) return liste;
  return setHierarchyTree(liste, key, [...tree, { id: nextId("telaio-marca"), nome: t, modelli: [] }]);
}

export function rinominaMarcaHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  id: string,
  nuovoNome: string,
): MezziListePrefs {
  if (key === "attrezzature") return rinominaMarcaAttrezzatura(liste, id, nuovoNome);
  const t = nuovoNome.trim();
  if (!t) return liste;
  const next = getHierarchyTree(liste, key).map((m) => (m.id === id ? { ...m, nome: t } : m));
  return setHierarchyTree(liste, key, next);
}

export function eliminaMarcaHierarchy(liste: MezziListePrefs, key: HierarchyTreeKey, id: string): MezziListePrefs {
  if (key === "attrezzature") return eliminaMarcaAttrezzatura(liste, id);
  return setHierarchyTree(
    liste,
    key,
    getHierarchyTree(liste, key).filter((m) => m.id !== id),
  );
}

export function aggiungiModelloHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  marcaId: string,
  nome: string,
): MezziListePrefs {
  if (key === "attrezzature") return aggiungiModelloAttrezzatura(liste, marcaId, nome);
  const t = nome.trim();
  if (!t) return liste;
  const next = getHierarchyTree(liste, key).map((m) => {
    if (m.id !== marcaId) return m;
    if (m.modelli.some((x) => x.nome.trim().toLowerCase() === t.toLowerCase())) return m;
    return { ...m, modelli: [...m.modelli, { id: nextId("telaio-mod"), nome: t }] };
  });
  return setHierarchyTree(liste, key, next);
}

export function rinominaModelloHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  marcaId: string,
  modelloId: string,
  nuovoNome: string,
): MezziListePrefs {
  if (key === "attrezzature") return rinominaModelloAttrezzatura(liste, marcaId, modelloId, nuovoNome);
  const t = nuovoNome.trim();
  if (!t) return liste;
  const next = getHierarchyTree(liste, key).map((m) => {
    if (m.id !== marcaId) return m;
    return {
      ...m,
      modelli: m.modelli.map((x) => (x.id === modelloId ? { ...x, nome: t } : x)),
    };
  });
  return setHierarchyTree(liste, key, next);
}

export function eliminaModelloHierarchy(
  liste: MezziListePrefs,
  key: HierarchyTreeKey,
  marcaId: string,
  modelloId: string,
): MezziListePrefs {
  if (key === "attrezzature") return eliminaModelloAttrezzatura(liste, marcaId, modelloId);
  const next = getHierarchyTree(liste, key).map((m) =>
    m.id !== marcaId ? m : { ...m, modelli: m.modelli.filter((x) => x.id !== modelloId) },
  );
  return setHierarchyTree(liste, key, next);
}

export function ensureTelaiTree(liste: MezziListePrefs): MezziListePrefs {
  return {
    ...liste,
    tipiTelaio: [...(liste.tipiTelaio ?? [])],
    telai: Array.isArray(liste.telai) ? liste.telai : [],
  };
}
