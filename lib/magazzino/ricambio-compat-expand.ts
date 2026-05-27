import { parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import {
  compatLabelsPerMarcheHierarchy,
  flattenCompatFromHierarchyTree,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizeCompatList } from "@/lib/magazzino/form";

function normMarca(m: string): string {
  return m.trim().toLowerCase();
}

function linesForMarcaInTree(
  selected: readonly string[],
  allTreeLines: ReadonlySet<string>,
  marca: string,
): string[] {
  const want = normMarca(marca);
  return selected.filter((line) => {
    if (!allTreeLines.has(line)) return false;
    return normMarca(parseCompatMarcaModello(line).marca) === want;
  });
}

function expandTreeMarcheSenzaModelli(
  result: Set<string>,
  tree: HierarchyTreeKey,
  marcheFiltro: readonly string[],
  mezziListe: MezziListePrefs,
): void {
  const allLines = new Set(flattenCompatFromHierarchyTree(mezziListe, tree));
  const selected = [...result];

  for (const marca of marcheFiltro) {
    const m = marca.trim();
    if (!m) continue;
    const modelsForMarca = linesForMarcaInTree(selected, allLines, m);
    if (modelsForMarca.length > 0) continue;
    for (const line of compatLabelsPerMarcheHierarchy(mezziListe, tree, [m])) {
      result.add(line);
    }
  }
}

export type ExpandRicambioCompatOpts = {
  marcheAttrezzaturaFiltro: readonly string[];
  marcheTelaioFiltro: readonly string[];
  mezziListe: MezziListePrefs;
};

/**
 * Marca in filtro senza modelli espliciti → tutte le coppie «Marca — Modello» del dataset globale.
 * Se esiste almeno un modello selezionato per quella marca, non si espande.
 */
export function expandRicambioCompatibilitaMezzi(
  selected: readonly string[],
  opts: ExpandRicambioCompatOpts,
): string[] {
  const result = new Set(normalizeCompatList(selected));
  expandTreeMarcheSenzaModelli(result, "attrezzature", opts.marcheAttrezzaturaFiltro, opts.mezziListe);
  expandTreeMarcheSenzaModelli(result, "telai", opts.marcheTelaioFiltro, opts.mezziListe);
  return [...result].sort((a, b) => a.localeCompare(b, "it"));
}

/** Marche in filtro che verranno espanse al salvataggio (nessun modello ancora selezionato). */
export function marchePendingUniversalCompatExpand(
  selected: readonly string[],
  opts: ExpandRicambioCompatOpts,
): { attrezzature: string[]; telai: string[] } {
  const attTree = new Set(flattenCompatFromHierarchyTree(opts.mezziListe, "attrezzature"));
  const telTree = new Set(flattenCompatFromHierarchyTree(opts.mezziListe, "telai"));
  const normalized = normalizeCompatList(selected);

  const attrezzature: string[] = [];
  for (const marca of opts.marcheAttrezzaturaFiltro) {
    const m = marca.trim();
    if (!m) continue;
    if (linesForMarcaInTree(normalized, attTree, m).length === 0) attrezzature.push(m);
  }

  const telai: string[] = [];
  for (const marca of opts.marcheTelaioFiltro) {
    const m = marca.trim();
    if (!m) continue;
    if (linesForMarcaInTree(normalized, telTree, m).length === 0) telai.push(m);
  }

  return { attrezzature, telai };
}
