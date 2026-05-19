import {
  aggiungiMarca as aggiungiMarcaAttrezzatura,
  aggiungiModello as aggiungiModelloAttrezzatura,
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

function normalizeTree(raw: unknown): AttrezzaturaMarca[] {
  if (!Array.isArray(raw)) return [];
  const out: AttrezzaturaMarca[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const nome = typeof r.nome === "string" && r.nome.trim() ? r.nome.trim() : "";
    if (!id || !nome) continue;
    const modRaw = r.modelli;
    const modelli: AttrezzaturaMarca["modelli"] = [];
    if (Array.isArray(modRaw)) {
      for (const m of modRaw) {
        if (!m || typeof m !== "object") continue;
        const mo = m as Record<string, unknown>;
        const mid = typeof mo.id === "string" && mo.id.trim() ? mo.id.trim() : "";
        const mn = typeof mo.nome === "string" && mo.nome.trim() ? mo.nome.trim() : "";
        if (mid && mn) modelli.push({ id: mid, nome: mn });
      }
    }
    out.push({ id, nome, modelli });
  }
  return out;
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
