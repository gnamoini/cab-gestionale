import {
  compatLabelMarcaModello,
  migrateMezziListePrefs,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import {
  flattenCompatFromHierarchyTree,
  getHierarchyTree,
  modelliVisibiliPerMarcaHierarchy,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { compatLineDisplayText } from "@/lib/magazzino/compat/compat-display";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import { resolveCompatibilitaLabels } from "@/lib/magazzino/compat/resolve-compatibilita-ricambio";

export type RicambioCompatRef = {
  tree: HierarchyTreeKey;
  marcaId: string;
  modelloId?: string;
};

const TREES: HierarchyTreeKey[] = ["attrezzature", "telai"];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function isCompatMarcaUniversalLine(line: string): boolean {
  const { marca, modello } = parseCompatMarcaModello(line.trim());
  return Boolean(marca) && !modello;
}

export function marcaUniversalCompatLabel(marcaNome: string): string {
  return compatLabelMarcaModello(marcaNome.trim(), "");
}

export function compatRefKey(ref: RicambioCompatRef): string {
  return `${ref.tree}:${ref.marcaId}:${ref.modelloId ?? "*"}`;
}

export function dedupeCompatRefs(refs: readonly RicambioCompatRef[]): RicambioCompatRef[] {
  const seen = new Set<string>();
  const out: RicambioCompatRef[] = [];
  for (const ref of refs) {
    const k = compatRefKey(ref);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(ref);
  }
  return out;
}

/** Ref marca senza modello è ridondante se esiste ref modello per la stessa marca/albero. */
export function dedupeCompatRefsPreferExplicitModels(refs: readonly RicambioCompatRef[]): RicambioCompatRef[] {
  const deduped = dedupeCompatRefs(refs);
  const marcheWithModel = new Set<string>();
  for (const r of deduped) {
    if (r.modelloId) marcheWithModel.add(`${r.tree}:${r.marcaId}`);
  }
  return deduped.filter((r) => {
    if (r.modelloId) return true;
    return !marcheWithModel.has(`${r.tree}:${r.marcaId}`);
  });
}

function findMarcaByNome(liste: MezziListePrefs, tree: HierarchyTreeKey, nome: string) {
  // ponytail: `liste` deve essere già mergeata con flotta (useGlobalOptions / useGlobalListOptions).
  return getHierarchyTree(migrateMezziListePrefs(liste), tree).find((m) => norm(m.nome) === norm(nome));
}

/** Confronto modello tollerante spazi (legacy «500 ET» vs gerarchia «500ET»). */
function normCompact(s: string): string {
  return norm(s).replace(/\s+/g, "");
}

function findModelloByNome(marca: { modelli: { id: string; nome: string }[] }, nome: string) {
  const byExact = marca.modelli.find((m) => norm(m.nome) === norm(nome));
  if (byExact) return byExact;
  const compact = normCompact(nome);
  if (!compact) return undefined;
  return marca.modelli.find((m) => normCompact(m.nome) === compact);
}

export type LabelToCompatRefOptions = {
  /** Albero settings (ID stabili) — ha priorità su `liste` merged/flotta. */
  prefsListe?: MezziListePrefs;
};

export type ResolveCompatRefLabelOptions = {
  prefsListe?: MezziListePrefs;
};

function isFleetCompatId(id: string): boolean {
  return id.startsWith("fleet-marca-") || id.startsWith("fleet-mod-");
}

function findModelloByIdAcrossTree(
  p: ReturnType<typeof migrateMezziListePrefs>,
  tree: HierarchyTreeKey,
  modelloId: string,
): { marca: { id: string; nome: string; modelli: { id: string; nome: string }[] }; mod: { id: string; nome: string } } | null {
  for (const marca of getHierarchyTree(p, tree)) {
    const mod = marca.modelli.find((x) => x.id === modelloId);
    if (mod) return { marca, mod };
  }
  return null;
}

function resolveCompatRefLabelInListe(
  ref: RicambioCompatRef,
  liste: MezziListePrefs,
): string | null {
  const p = migrateMezziListePrefs(liste);
  let marca = getHierarchyTree(p, ref.tree).find((m) => m.id === ref.marcaId);

  if (!marca && ref.modelloId) {
    const cross = findModelloByIdAcrossTree(p, ref.tree, ref.modelloId);
    if (cross) marca = cross.marca;
  }

  if (!marca) return null;
  if (!ref.modelloId) return marcaUniversalCompatLabel(marca.nome);

  const mod = marca.modelli.find((x) => x.id === ref.modelloId);
  if (mod) return compatLabelMarcaModello(marca.nome, mod.nome);

  const cross = findModelloByIdAcrossTree(p, ref.tree, ref.modelloId);
  if (cross) return compatLabelMarcaModello(cross.marca.nome, cross.mod.nome);

  return marcaUniversalCompatLabel(marca.nome);
}

function labelToCompatRefInListe(line: string, liste: MezziListePrefs): RicambioCompatRef | null {
  const { marca, modello } = parseCompatMarcaModello(line.trim());
  if (!marca) return null;

  for (const tree of TREES) {
    const hit = findMarcaByNome(liste, tree, marca);
    if (!hit) continue;
    if (!modello) return { tree, marcaId: hit.id };
    const mod = findModelloByNome(hit, modello);
    if (mod) return { tree, marcaId: hit.id, modelloId: mod.id };
  }
  return null;
}

export function labelToCompatRef(
  line: string,
  liste: MezziListePrefs,
  opts?: LabelToCompatRefOptions,
): RicambioCompatRef | null {
  if (opts?.prefsListe) {
    const fromPrefs = labelToCompatRefInListe(line, opts.prefsListe);
    if (fromPrefs) return fromPrefs;
  }
  return labelToCompatRefInListe(line, liste);
}

export function labelsToCompatRefs(
  lines: readonly string[],
  liste: MezziListePrefs,
  opts?: LabelToCompatRefOptions,
): RicambioCompatRef[] {
  const refs: RicambioCompatRef[] = [];
  for (const line of normalizeCompatList(lines)) {
    const ref = labelToCompatRef(line, liste, opts);
    if (ref) refs.push(ref);
  }
  return dedupeCompatRefs(refs);
}

export function resolveCompatRefLabel(
  ref: RicambioCompatRef,
  liste: MezziListePrefs,
  opts?: ResolveCompatRefLabelOptions,
): string | null {
  const fromMerged = resolveCompatRefLabelInListe(ref, liste);
  if (fromMerged) return fromMerged;
  if (opts?.prefsListe) return resolveCompatRefLabelInListe(ref, opts.prefsListe);
  return null;
}

/** Remappa ref con ID fleet-* instabili verso ID prefs stabili. */
export function sanitizeCompatRefsForPersist(
  refs: readonly RicambioCompatRef[],
  liste: MezziListePrefs,
  opts?: LabelToCompatRefOptions,
): RicambioCompatRef[] {
  const out: RicambioCompatRef[] = [];
  for (const ref of dedupeCompatRefs(refs)) {
    const hasFleetId =
      isFleetCompatId(ref.marcaId) || (ref.modelloId != null && isFleetCompatId(ref.modelloId));
    if (!hasFleetId) {
      out.push(ref);
      continue;
    }
    const label = resolveCompatRefLabel(ref, liste, { prefsListe: opts?.prefsListe });
    if (!label) continue;
    const remapped = labelToCompatRef(label, liste, opts);
    if (remapped) out.push(remapped);
  }
  return dedupeCompatRefs(out);
}

export function resolveCompatRefDisplayLabel(
  ref: RicambioCompatRef,
  liste: MezziListePrefs,
  opts?: ResolveCompatRefLabelOptions,
): string {
  const label = resolveCompatRefLabel(ref, liste, opts);
  if (!label) return "[compatibilità non risolvibile]";
  return compatLineDisplayText(label);
}

export function refsToCompatLabels(
  refs: readonly RicambioCompatRef[],
  liste: MezziListePrefs,
  opts?: ResolveCompatRefLabelOptions,
): string[] {
  const out: string[] = [];
  for (const ref of dedupeCompatRefs(refs)) {
    const label = resolveCompatRefLabel(ref, liste, opts);
    if (label) out.push(label);
  }
  return out.sort((a, b) => a.localeCompare(b, "it"));
}

/** Collassa espansioni legacy (tutti i modelli di una marca) in riga marca-universale. */
export function collapseLegacyExpandedMarcaUniversal(
  lines: readonly string[],
  liste: MezziListePrefs,
): string[] {
  const normalized = normalizeCompatList(lines);
  if (normalized.length === 0) return normalized;

  const p = migrateMezziListePrefs(liste);
  const result = new Set(normalized);

  for (const tree of TREES) {
    for (const marca of getHierarchyTree(p, tree)) {
      const marcaNome = marca.nome.trim();
      if (!marcaNome) continue;
      const allModels = modelliVisibiliPerMarcaHierarchy(p, tree, marcaNome);
      if (allModels.length === 0) continue;

      const selectedForMarca = normalized.filter((line) => {
        const parsed = parseCompatMarcaModello(line);
        return norm(parsed.marca) === norm(marcaNome) && Boolean(parsed.modello);
      });
      if (selectedForMarca.length !== allModels.length) continue;

      const allPresent = allModels.every((mod) =>
        selectedForMarca.some((line) => normCompact(parseCompatMarcaModello(line).modello) === normCompact(mod)),
      );
      if (!allPresent) continue;

      for (const line of selectedForMarca) result.delete(line);
      result.add(marcaUniversalCompatLabel(marcaNome));
    }
  }

  return [...result].sort((a, b) => a.localeCompare(b, "it"));
}

export function resolveRicambioCompatLabels(
  compatibilitaMezzi: readonly string[] | undefined,
  compatibilitaRefs: readonly RicambioCompatRef[] | undefined,
  liste: MezziListePrefs,
): string[] {
  return resolveCompatibilitaLabels(
    { compatibilitaMezzi: compatibilitaMezzi ? [...compatibilitaMezzi] : [], compatibilitaRefs: compatibilitaRefs ? [...compatibilitaRefs] : undefined },
    liste,
  );
}

export function compatDisplayLabelsFromResolved(lines: readonly string[]): string {
  const compat = normalizeCompatList(lines);
  if (compat.length === 0) return "Universale (tutte le macchine)";
  return compat.map(compatLineDisplayText).join(", ");
}

export function isAllowedCompatLine(line: string, liste: MezziListePrefs): boolean {
  const t = line.trim();
  if (!t) return false;
  if (isCompatMarcaUniversalLine(t)) {
    const { marca } = parseCompatMarcaModello(t);
    for (const tree of TREES) {
      if (findMarcaByNome(liste, tree, marca)) return true;
    }
    return false;
  }
  const allowed = new Set([
    ...flattenCompatFromHierarchyTree(migrateMezziListePrefs(liste), "attrezzature"),
    ...flattenCompatFromHierarchyTree(migrateMezziListePrefs(liste), "telai"),
  ]);
  return allowed.has(t);
}

export function parseCompatRefs(raw: unknown): RicambioCompatRef[] {
  if (!Array.isArray(raw)) return [];
  const out: RicambioCompatRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const tree = r.tree;
    const marcaId = typeof r.marcaId === "string" ? r.marcaId.trim() : "";
    if ((tree !== "attrezzature" && tree !== "telai") || !marcaId) continue;
    const modelloId = typeof r.modelloId === "string" && r.modelloId.trim() ? r.modelloId.trim() : undefined;
    out.push({ tree, marcaId, modelloId });
  }
  return dedupeCompatRefs(out);
}
