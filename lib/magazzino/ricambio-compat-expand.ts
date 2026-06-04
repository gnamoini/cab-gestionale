import { migrateMezziListePrefs, parseCompatMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import {
  flattenCompatFromHierarchyTree,
  marcheFromHierarchyTree,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { normalizeCompatList } from "@/lib/magazzino/compat/compat-normalize";
import {
  isCompatMarcaUniversalLine,
  marcaUniversalCompatLabel,
} from "@/lib/magazzino/ricambio-compat-resolver";

function normMarca(m: string): string {
  return m.trim().toLowerCase();
}

function canonicalMarcaInTree(marca: string, tree: HierarchyTreeKey, mezziListe: MezziListePrefs): string | null {
  const marche = marcheFromHierarchyTree(migrateMezziListePrefs(mezziListe), tree);
  return marche.find((m) => normMarca(m) === normMarca(marca)) ?? null;
}

/** Compat line appartiene ad attrezzature o telai (modello esplicito o universale marca). */
export function lineBelongsToHierarchyTree(
  line: string,
  tree: HierarchyTreeKey,
  mezziListe: MezziListePrefs,
): boolean {
  const p = migrateMezziListePrefs(mezziListe);
  const labels = new Set(flattenCompatFromHierarchyTree(p, tree));
  if (labels.has(line.trim())) return true;
  if (!isCompatMarcaUniversalLine(line)) return false;
  const { marca } = parseCompatMarcaModello(line);
  return Boolean(canonicalMarcaInTree(marca, tree, mezziListe));
}

/** Rimuove compat (modelli + universale marca) di una marca in un albero. */
export function stripCompatLinesForMarcaInTree(
  lines: readonly string[],
  marca: string,
  tree: HierarchyTreeKey,
  mezziListe: MezziListePrefs,
): string[] {
  return lines.filter((line) => {
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) return true;
    return normMarca(parseCompatMarcaModello(line).marca) !== normMarca(marca);
  });
}

/** Ricostruisce filtri marca attrezzatura/telaio da compat salvata (modifica ricambio). */
export function deriveMarcheFiltroFromCompatLabels(
  labels: readonly string[],
  mezziListe: MezziListePrefs,
): { attrezzature: string[]; telai: string[] } {
  const attSet = new Set<string>();
  const telSet = new Set<string>();

  for (const line of normalizeCompatList(labels)) {
    const { marca } = parseCompatMarcaModello(line);
    if (!marca) continue;
    const att = canonicalMarcaInTree(marca, "attrezzature", mezziListe);
    const tel = canonicalMarcaInTree(marca, "telai", mezziListe);
    if (att && (isCompatMarcaUniversalLine(line) || lineBelongsToHierarchyTree(line, "attrezzature", mezziListe))) {
      attSet.add(att);
    }
    if (tel && (isCompatMarcaUniversalLine(line) || lineBelongsToHierarchyTree(line, "telai", mezziListe))) {
      telSet.add(tel);
    }
  }

  return {
    attrezzature: [...attSet].sort((a, b) => a.localeCompare(b, "it")),
    telai: [...telSet].sort((a, b) => a.localeCompare(b, "it")),
  };
}

function linesForMarcaInTree(
  selected: readonly string[],
  allTreeLines: ReadonlySet<string>,
  marca: string,
): string[] {
  const want = normMarca(marca);
  // Solo righe ancora presenti nell'albero mezzi: legacy obsolete non bloccano universale marca.
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
    result.add(marcaUniversalCompatLabel(m));
  }
}

/** Se esistono modelli espliciti per una marca, la riga universale marca è ridondante. */
function stripUniversalWhenExplicitModelsPresent(
  result: Set<string>,
  tree: HierarchyTreeKey,
  mezziListe: MezziListePrefs,
): void {
  const allLines = new Set(flattenCompatFromHierarchyTree(mezziListe, tree));
  for (const line of [...result]) {
    if (!isCompatMarcaUniversalLine(line)) continue;
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) continue;
    const { marca } = parseCompatMarcaModello(line);
    if (!marca) continue;
    if (linesForMarcaInTree([...result], allLines, marca).length > 0) {
      result.delete(line);
    }
  }
}

/** Normalizza elenco compat: modello esplicito prevale su universale marca (stesso albero). */
export function preferExplicitModelsOverUniversalMarca(
  lines: readonly string[],
  mezziListe: MezziListePrefs,
): string[] {
  const result = new Set(normalizeCompatList(lines));
  stripUniversalWhenExplicitModelsPresent(result, "attrezzature", mezziListe);
  stripUniversalWhenExplicitModelsPresent(result, "telai", mezziListe);
  return [...result].sort((a, b) => a.localeCompare(b, "it"));
}

export type ExpandRicambioCompatOpts = {
  marcheAttrezzaturaFiltro: readonly string[];
  marcheTelaioFiltro: readonly string[];
  mezziListe: MezziListePrefs;
};

/**
 * Marca in filtro senza modelli espliciti → riga «Marca — » (universale per marca).
 * Se esiste almeno un modello selezionato per quella marca, non si aggiunge universale marca.
 */
export function expandRicambioCompatibilitaMezzi(
  selected: readonly string[],
  opts: ExpandRicambioCompatOpts,
): string[] {
  const result = new Set(normalizeCompatList(selected));
  expandTreeMarcheSenzaModelli(result, "attrezzature", opts.marcheAttrezzaturaFiltro, opts.mezziListe);
  expandTreeMarcheSenzaModelli(result, "telai", opts.marcheTelaioFiltro, opts.mezziListe);
  stripUniversalWhenExplicitModelsPresent(result, "attrezzature", opts.mezziListe);
  stripUniversalWhenExplicitModelsPresent(result, "telai", opts.mezziListe);
  return [...result].sort((a, b) => a.localeCompare(b, "it"));
}

/** Marche in filtro che verranno salvate come universale marca (nessun modello selezionato). */
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
